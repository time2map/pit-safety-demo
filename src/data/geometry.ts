/**
 * Scene geometry in [lng, lat]. Real terrain, fictional operations.
 * Digitised over satellite imagery: haul roads follow the working floor,
 * slope instruments sit on the benched west wall.
 */
export type LngLat = [number, number]

/** Haul and service paths. Haul paths run from the loading face to the dump. */
export const ROUTES = {
  haulA: [[19.321188,51.232649], [19.320931,51.233772], [19.320214,51.234895], [19.319445,51.236018], [19.318702,51.236949], [19.317984,51.237462]] as LngLat[],
  haulB: [[19.313243,51.23297], [19.313371,51.234414], [19.313756,51.235777], [19.31432,51.236901], [19.31555,51.237655], [19.317087,51.237815], [19.317907,51.237526]] as LngLat[],
  haulC: [[19.317292,51.233772], [19.317497,51.234895], [19.317805,51.236018], [19.317959,51.23682], [19.317984,51.237462]] as LngLat[],
  serviceRoad: [[19.311065,51.240832], [19.311142,51.238746], [19.311193,51.2365], [19.311296,51.234253], [19.311398,51.232007]] as LngLat[],
  dumpShuttle: [[19.318881,51.237879], [19.31965,51.237591], [19.320368,51.23727]] as LngLat[],
  dozerScript: [[19.302678,51.234095], [19.301823,51.234387], [19.301046,51.234679], [19.300884,51.234739]] as LngLat[],
  surveyorScript: [[19.320956,51.231403], [19.3211,51.2314], [19.322175,51.23138]] as LngLat[],
}

export type RouteId = keyof typeof ROUTES

/** Fixed points: loading faces, dump, instruments, blast block centre. */
export const POINTS = {
  EX01: [19.321341,51.23252] as LngLat,
  EX02: [19.313192,51.232809] as LngLat,
  EX03: [19.317267,51.233611] as LngLat,
  dump: [19.317984,51.237526] as LngLat,
  drillBlock: [19.313038,51.239516] as LngLat,
  DR01: [19.31268,51.239644] as LngLat,
  DR02: [19.313397,51.239388] as LngLat,
  DZ01home: [19.31965,51.237591] as LngLat,
  WL01: [19.318625,51.237751] as LngLat,
  SR1: [19.309281,51.2375] as LngLat,
  TS1: [19.308893,51.239567] as LngLat,
  SS1: [19.315293,51.232328] as LngLat,
  B1: [19.326405,51.2313] as LngLat,
  IW01: [19.298599,51.233122] as LngLat,
  IW02: [19.300347,51.234946] as LngLat,
  IW03: [19.302289,51.236892] as LngLat,
  IW04: [19.304232,51.238837] as LngLat,
  IW05: [19.305979,51.240782] as LngLat,
  PZ01: [19.29957,51.232879] as LngLat,
  PZ02: [19.301318,51.234703] as LngLat,
  PZ03: [19.30326,51.236648] as LngLat,
  PZ04: [19.305203,51.238594] as LngLat,
  P01: [19.299493,51.234046] as LngLat,
  P02: [19.301318,51.235919] as LngLat,
  P03: [19.30326,51.237864] as LngLat,
  P04: [19.305086,51.23981] as LngLat,
  P05: [19.306756,51.241634] as LngLat,
}

/** Slope radar scan area (polygon ring, not closed). */
export const RADAR_AREA: LngLat[] = [[19.297705,51.233908], [19.300229,51.233055], [19.307146,51.239694], [19.304622,51.240642]]

/** Centres of areas where people move around on foot. Radius in metres. Edges stay at least 25 m from every vehicle route. */
export const PEOPLE_AREAS = {
  office: { center: [19.316575,51.238368] as LngLat, radius: 35 },
  workshop: { center: [19.310435,51.232373] as LngLat, radius: 35 },
  floor: { center: [19.314698,51.234574] as LngLat, radius: 40 },
  geotech: { center: [19.308893,51.239567] as LngLat, radius: 35 },
  drill: { center: [19.314012,51.239067] as LngLat, radius: 40 },
  stockpile: { center: [19.321188,51.238425] as LngLat, radius: 45 },
}

/** Strike of the benches on the west wall, degrees clockwise from north. */
export const BENCH_STRIKE_DEG = 31
