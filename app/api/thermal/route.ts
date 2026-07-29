const FIRMS_AREA_ENDPOINT =
  "https://firms.modaps.eosdis.nasa.gov/api/area/csv";
const FIRMS_DOCS =
  "https://firms.modaps.eosdis.nasa.gov/api/area/";
const BOUNDS = {
  west: 26.2,
  south: 38.85,
  east: 26.6,
  north: 39.15,
};

const DATASETS = [
  { id: "VIIRS_NOAA20_NRT", label: "NOAA-20 VIIRS" },
  { id: "VIIRS_NOAA21_NRT", label: "NOAA-21 VIIRS" },
  { id: "VIIRS_SNPP_NRT", label: "Suomi-NPP VIIRS" },
] as const;

type CsvRow = Record<string, string>;

type ThermalDetection = {
  id: string;
  lat: number;
  lon: number;
  sensor: string;
  satellite: string;
  observedAt: string;
  confidence: string;
  frpMw: number | null;
  scanKm: number | null;
  trackKm: number | null;
  daynight: string | null;
};

function parseCsvLine(line: string) {
  const values: string[] = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      values.push(value);
      value = "";
    } else {
      value += character;
    }
  }

  values.push(value);
  return values;
}

function parseCsv(csv: string): CsvRow[] {
  const lines = csv
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim() !== "");

  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]).map((header) =>
    header.trim().toLowerCase(),
  );

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(
      headers.map((header, index) => [header, values[index]?.trim() ?? ""]),
    );
  });
}

function finiteNumber(value: string | undefined) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function confidenceLabel(value: string | undefined) {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "h" || normalized === "high") return "High";
  if (normalized === "n" || normalized === "nominal") return "Nominal";
  if (normalized === "l" || normalized === "low") return "Low";
  return value?.trim() || "Unknown";
}

function acquisitionTime(date: string | undefined, time: string | undefined) {
  if (!date) return null;
  const digits = (time ?? "").replace(/\D/g, "").padStart(4, "0").slice(-4);
  const observedAt = `${date}T${digits.slice(0, 2)}:${digits.slice(2)}:00Z`;
  return Number.isNaN(Date.parse(observedAt)) ? null : observedAt;
}

async function fetchDataset(
  mapKey: string,
  dataset: (typeof DATASETS)[number],
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9_000);
  const area = `${BOUNDS.west},${BOUNDS.south},${BOUNDS.east},${BOUNDS.north}`;

  try {
    const response = await fetch(
      `${FIRMS_AREA_ENDPOINT}/${encodeURIComponent(mapKey)}/${dataset.id}/${area}/1`,
      {
        cache: "no-store",
        headers: { Accept: "text/csv" },
        signal: controller.signal,
      },
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const body = await response.text();
    if (/transaction limit|invalid map key|error/i.test(body.slice(0, 300))) {
      throw new Error("FIRMS rejected the request");
    }

    return parseCsv(body)
      .map((row): ThermalDetection | null => {
        const lat = finiteNumber(row.latitude);
        const lon = finiteNumber(row.longitude);
        const observedAt = acquisitionTime(row.acq_date, row.acq_time);
        if (
          lat === null ||
          lon === null ||
          observedAt === null ||
          lat < BOUNDS.south ||
          lat > BOUNDS.north ||
          lon < BOUNDS.west ||
          lon > BOUNDS.east
        ) {
          return null;
        }

        const satellite = row.satellite || dataset.id;
        return {
          id: [
            satellite,
            observedAt,
            lat.toFixed(5),
            lon.toFixed(5),
          ].join("-"),
          lat,
          lon,
          sensor: dataset.label,
          satellite,
          observedAt,
          confidence: confidenceLabel(row.confidence),
          frpMw: finiteNumber(row.frp),
          scanKm: finiteNumber(row.scan),
          trackKm: finiteNumber(row.track),
          daynight: row.daynight || null,
        };
      })
      .filter((detection): detection is ThermalDetection => detection !== null);
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET() {
  const generatedAt = new Date().toISOString();
  const mapKey = process.env.FIRMS_MAP_KEY?.trim();

  if (!mapKey) {
    return Response.json(
      {
        generatedAt,
        mode: "gibs-wms-fallback",
        latestObservedAt: null,
        detections: [],
        errors: ["FIRMS server key is not configured"],
        source: {
          label: "NASA FIRMS",
          docs: FIRMS_DOCS,
          refreshMinutes: 15,
          typicalLatencyHours: 3,
        },
      },
      {
        headers: {
          "Cache-Control":
            "public, max-age=60, s-maxage=300, stale-while-revalidate=900",
        },
      },
    );
  }

  const settled = await Promise.allSettled(
    DATASETS.map((dataset) => fetchDataset(mapKey, dataset)),
  );
  const errors: string[] = [];
  const detections = settled
    .flatMap((result, index) => {
      if (result.status === "fulfilled") return result.value;
      errors.push(`${DATASETS[index].label} unavailable`);
      return [];
    })
    .filter(
      (detection, index, rows) =>
        rows.findIndex((candidate) => candidate.id === detection.id) === index,
    )
    .sort(
      (left, right) =>
        Date.parse(right.observedAt) - Date.parse(left.observedAt),
    );

  return Response.json(
    {
      generatedAt,
      mode: "firms-area-api",
      latestObservedAt: detections[0]?.observedAt ?? null,
      detections,
      errors,
      source: {
        label: "NASA FIRMS",
        docs: FIRMS_DOCS,
        refreshMinutes: 15,
        typicalLatencyHours: 3,
      },
    },
    {
      headers: {
        "Cache-Control":
          "public, max-age=60, s-maxage=300, stale-while-revalidate=900",
      },
    },
  );
}
