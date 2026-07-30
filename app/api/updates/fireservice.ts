import { normalizeSearch } from "./text";

export const FIRE_SERVICE_BOARD_URL =
  "https://www.fireservice.gr/apps/fire2019/symvanta/page.php";

export type FireServiceStatus =
  | "in-progress"
  | "partial-control"
  | "full-control"
  | "ended";

export type FireServiceIncident = {
  status: FireServiceStatus;
  statusLabel: string;
  municipality: string;
  incidentType: string;
  sourceAge: string | null;
};

const PLOMARI_ROW = "δ. λεσβου - πλωμαριου";
const PLOMARI_STARTED_ON = "29/07/2026";
const INCIDENT_CONTAINER_PATTERN =
  /<div\b[^>]*class=["']([^"']*(?:panel-(?:red|yellow|green)|bg-info)[^"']*)["'][^>]*>[\s\S]*?<\/div>\s*<\/div>/gi;
const FOREST_FIRE_SECTION_PATTERN = /<div\b[^>]*\bid=["']L1["'][^>]*>/i;
const NEXT_SECTION_PATTERN = /<div\b[^>]*\bid=["']P1["'][^>]*>/i;

function forestFireSection(html: string): string {
  const start = html.search(FOREST_FIRE_SECTION_PATTERN);
  if (start < 0) throw new Error("Forest-fire section not parsed");

  const remainder = html.slice(start);
  const nextSection = remainder.search(NEXT_SECTION_PATTERN);
  if (nextSection < 0) throw new Error("Forest-fire section boundary not parsed");
  return remainder.slice(0, nextSection);
}

function statusFromContainerClass(value: string): FireServiceStatus | null {
  const classes = new Set(value.split(/\s+/));
  if (classes.has("panel-red")) return "in-progress";
  if (classes.has("panel-yellow")) return "partial-control";
  if (classes.has("panel-green")) return "full-control";
  if (classes.has("bg-info")) return "ended";
  return null;
}

function statusFromHeading(value: string): FireServiceStatus | null {
  const headings = Array.from(
    value.matchAll(
      /(σε εξελιξη|μερικος ελεγχος|πληρης ελεγχος|ληξη)\s*\(\d+\)/g,
    ),
  );
  const heading = headings.at(-1)?.[1];
  if (heading === "σε εξελιξη") return "in-progress";
  if (heading === "μερικος ελεγχος") return "partial-control";
  if (heading === "πληρης ελεγχος") return "full-control";
  if (heading === "ληξη") return "ended";
  return null;
}

// The official board has no API. Find the target incident's status container
// first, then parse all fields only inside it so a neighboring incident can
// never supply Plomari's status or update age.
export function parseFireServiceBoard(html: string): FireServiceIncident {
  const section = forestFireSection(html);
  if (!normalizeSearch(section, section.length).includes(PLOMARI_ROW)) {
    throw new Error("Plomari row not found");
  }

  const matches = Array.from(section.matchAll(INCIDENT_CONTAINER_PATTERN)).filter(
    (candidate) => {
      const candidateText = normalizeSearch(candidate[0] ?? "");
      const candidateStatus = statusFromContainerClass(candidate[1] ?? "");
      return (
        candidateText.includes(PLOMARI_ROW) &&
        (candidateText.includes(PLOMARI_STARTED_ON) || candidateStatus === "ended")
      );
    },
  );
  if (matches.length !== 1) {
    throw new Error("Plomari incident signature not unique");
  }
  const match = matches[0];
  const container = match?.[0];
  if (container === undefined) {
    throw new Error("Plomari incident container not parsed");
  }

  const containerStatus = statusFromContainerClass(match?.[1] ?? "");
  const containerIndex = match?.index;
  if (containerIndex === undefined) {
    throw new Error("Plomari incident position not parsed");
  }
  const sectionPrefix = section.slice(0, containerIndex);
  const sectionStatus = statusFromHeading(
    normalizeSearch(sectionPrefix, sectionPrefix.length),
  );
  if (containerStatus === null || sectionStatus !== containerStatus) {
    throw new Error("Plomari status not parsed");
  }
  const status = containerStatus;

  const incidentText = normalizeSearch(container);
  const sourceAge =
    incidentText.match(
      /τελευταια ενημερωση πριν απο\s+(\d+\s+(?:δευτερολεπτ(?:ο|α)|λεπτ(?:ο|α)|ωρ(?:α|ες)|ημερ(?:α|ες)))/,
    )?.[1] ?? null;

  return {
    status,
    statusLabel:
      status === "in-progress"
        ? "IN PROGRESS"
        : status === "partial-control"
          ? "PARTIAL CONTROL"
          : status === "full-control"
            ? "FULL CONTROL"
            : "ENDED",
    municipality: "Lesvos · Plomari",
    incidentType: "Wildfire incident",
    sourceAge,
  };
}
