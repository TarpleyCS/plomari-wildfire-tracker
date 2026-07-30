# Source Integration Roadmap

**Status:** reviewed architecture input
**Godseye baseline:** commit
[`bd982bc`](https://github.com/VrushankPatel/godseye/commit/bd982bce880378dfb90a3d6cfe4d117b01f47080),
5 July 2026
**Updated:** 30 July 2026

## Decision

Adopt God's Eye's breadth of operational context, not its source semantics or
client-side collection patterns. Every source enters this backend as a disabled,
unreviewed provider → endpoint → collection-target contract and remains private
until authority, licensing, retention, fixtures, and public wording are approved.

The upstream source of truth for the current layer inventory is its
[`LAYER_DEFS`](https://github.com/VrushankPatel/godseye/blob/bd982bce880378dfb90a3d6cfe4d117b01f47080/src/constants/dataSources.js#L158-L185)
and the components mounted by
[`Globe.jsx`](https://github.com/VrushankPatel/godseye/blob/bd982bce880378dfb90a3d6cfe4d117b01f47080/src/components/Globe.jsx#L5-L29),
not the upstream README.

## Already represented

These Godseye source families are present in the disabled Supabase seed catalog:

| Source family | Our intended role | Important difference |
| --- | --- | --- |
| NASA FIRMS | Wildfire thermal-anomaly evidence | Keyed VIIRS/MODIS Area API; never substitute another provider for an empty or unavailable result |
| NASA EONET | Wildfire discovery context | Not a thermal point, perimeter, or local authority |
| GDACS | Cross-border discovery/corroboration | Not a substitute for local incident status |
| Open-Meteo weather | Explicitly modeled weather context | Query incident/AOI targets rather than hard-coded global display nodes |
| NOAA/NWS alerts | Jurisdiction- and validity-bound U.S. hazard advisories | Preserve the upstream hazard type; do not rename heat or wind alerts as wildfire alerts |
| NOAA AviationWeather METAR | Measured airport weather | Keep measurements separate from advisories and from fireground conditions |

Godseye's active FIRMS implementation can substitute EONET wildfire-event points
when the thermal result is empty or unusable. That behavior, visible in
[`FireHotspotsLayer.jsx`](https://github.com/VrushankPatel/godseye/blob/bd982bce880378dfb90a3d6cfe4d117b01f47080/src/layers/FireHotspotsLayer.jsx#L255-L380),
is deliberately rejected here because it collapses source identity and turns
empty/unavailable into a different observation class.

## P0: wildfire operations

- Add direct, authoritative road closure, reopening, and access-status products
  for every launch jurisdiction. Camera catalogs and animated traffic are not
  substitutes for a road-authority statement.
- Complete and shadow the existing wildfire catalog: FIRMS, EONET, GDACS,
  national/regional fire and civil-protection authorities, NWS/Meteoalarm,
  EFFIS, GWIS, INFORCYL, INFOCA, GIBS, modeled weather, and METAR.
- Keep incident discovery separate from incident creation/adjudication and from
  authoritative operational status.

## P1: useful operational context

| Candidate | Upstream implementation evidence | Admission requirements |
| --- | --- | --- |
| Open-Meteo Air Quality | [`AirQualityLayer.jsx`](https://github.com/VrushankPatel/godseye/blob/bd982bce880378dfb90a3d6cfe4d117b01f47080/src/layers/AirQualityLayer.jsx#L106-L142) | Preserve US AQI, PM2.5, PM10, NO₂, and O₃ as separate fields; review modeled/observed semantics |
| U.S. outage context | [`PowerGridLayer.jsx`](https://github.com/VrushankPatel/godseye/blob/bd982bce880378dfb90a3d6cfe4d117b01f47080/src/layers/PowerGridLayer.jsx#L245-L262) | Keep ODIN outages separate from WRI static power-plant infrastructure; add jurisdictional feeds elsewhere |
| Official road cameras | [`CameraLayer.jsx`](https://github.com/VrushankPatel/godseye/blob/bd982bce880378dfb90a3d6cfe4d117b01f47080/src/layers/CameraLayer.jsx#L193-L238) | Direct authority adapters only; stable location/time; reviewed embed/cache rights; no fallback image |
| OurAirports | [`AirportsLayer.jsx`](https://github.com/VrushankPatel/godseye/blob/bd982bce880378dfb90a3d6cfe4d117b01f47080/src/layers/AirportsLayer.jsx#L285-L300) | Static infrastructure context only, never proof an airport is open or operationally available |
| NOAA NDBC buoys | [`OceanBuoysLayer.jsx`](https://github.com/VrushankPatel/godseye/blob/bd982bce880378dfb90a3d6cfe4d117b01f47080/src/layers/OceanBuoysLayer.jsx) | Direct server-side retrieval; measured-time and station-location provenance |
| NGA World Port Index | [`MaritimeLayer.jsx`](https://github.com/VrushankPatel/godseye/blob/bd982bce880378dfb90a3d6cfe4d117b01f47080/src/layers/MaritimeLayer.jsx#L71-L79) | Static port infrastructure; attribute NGA and do not imply current port status |
| AIRSIGMET/SIGMET | [`AviationHazardsLayer.jsx`](https://github.com/VrushankPatel/godseye/blob/bd982bce880378dfb90a3d6cfe4d117b01f47080/src/layers/AviationHazardsLayer.jsx#L139-L186) | Preserve advisory product, geometry, validity, and issuer; never merge METAR into the same claim type |

## P2: compound hazards and moderated context

- USGS/IRIS seismic events and stations, and Smithsonian volcano notices, only
  as compound-hazard context.
- Satellite TLEs, NOAA space weather, and solar-flare products only after a
  concrete wildfire decision use case is defined.
- Aircraft and AIS positions only after licensing, responder-safety,
  aggregation, latency, retention, and public-interest review.
- Publisher/news/video/Wikidata OSINT only behind moderation, privacy, and
  incident-relevance controls. It can corroborate context but cannot create an
  official protective action.

## Rejected upstream behaviors

- Random traffic particles displayed as live flow.
- Static circles displayed as active airspace restrictions or forbidden zones.
- Military-flight, intent, or security inference from callsign/type/operator
  heuristics.
- Public CORS proxies for official feeds; production collectors connect
  server-to-server and retain the actual upstream provenance.
- Client-exposed provider credentials or encrypted caches whose decryption key
  ships to the browser.
- Unrelated camera, stock, or Unsplash images when a local feed is unavailable.
- FIRMS-derived severity codes presented as wildfire severity.
- Automated evacuation routing or personalized move/stay advice.

## Admission gates for every adapter

1. Verify the exact provider, endpoint, product meaning, terms URL, attribution,
   redistribution, cache, and retention conditions.
2. Define authority scope and public wording before enabling collection.
3. Add success, empty, partial, malformed, rate-limit, authentication, timeout,
   and correction fixtures with no credentials or personal data.
4. Persist raw acquisition, immutable source revision, normalized observation,
   incident relevance, parser/identity version, and source health separately.
5. Run in shadow mode and explain every divergence before allowing a reviewed,
   allowlisted field into a public read model.
