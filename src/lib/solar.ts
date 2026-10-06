export interface LocationCoords {
  name: string
  lat: number
  lon: number
}

export const KNOWN_LOCATIONS: Record<string, LocationCoords> = {
  firenze: { name: 'Firenze', lat: 43.77, lon: 11.25 },
  florence: { name: 'Firenze', lat: 43.77, lon: 11.25 },
  milano: { name: 'Milano', lat: 45.46, lon: 9.19 },
  milan: { name: 'Milano', lat: 45.46, lon: 9.19 },
  roma: { name: 'Roma', lat: 41.90, lon: 12.50 },
  rome: { name: 'Roma', lat: 41.90, lon: 12.50 },
  napoli: { name: 'Napoli', lat: 40.85, lon: 14.27 },
  naples: { name: 'Napoli', lat: 40.85, lon: 14.27 },
  palermo: { name: 'Palermo (Sicilia)', lat: 38.12, lon: 13.36 },
  sicilia: { name: 'Sicilia', lat: 37.60, lon: 14.01 },
  sicily: { name: 'Sicilia', lat: 37.60, lon: 14.01 },
  torino: { name: 'Torino', lat: 45.07, lon: 7.68 },
  turin: { name: 'Torino', lat: 45.07, lon: 7.68 },
  venezia: { name: 'Venezia', lat: 45.44, lon: 12.33 },
  venice: { name: 'Venezia', lat: 45.44, lon: 12.33 },
  bologna: { name: 'Bologna', lat: 44.49, lon: 11.34 },
  bari: { name: 'Bari', lat: 41.12, lon: 16.87 },
  genova: { name: 'Genova', lat: 44.41, lon: 8.93 },
  verona: { name: 'Verona', lat: 45.44, lon: 10.99 },
  brescia: { name: 'Brescia', lat: 45.54, lon: 10.22 },
  catania: { name: 'Catania', lat: 37.50, lon: 15.09 },
  cagliari: { name: 'Cagliari', lat: 39.22, lon: 9.12 },
  paris: { name: 'Paris', lat: 48.86, lon: 2.35 },
  madrid: { name: 'Madrid', lat: 40.42, lon: -3.70 },
  berlin: { name: 'Berlin', lat: 52.52, lon: 13.40 },
  london: { name: 'London', lat: 51.51, lon: -0.13 },
  zurich: { name: 'Zürich', lat: 47.38, lon: 8.54 },
}

export const COMPASS_BEARINGS: Record<string, number> = {
  N: 0,
  NNE: 22.5,
  NE: 45,
  ENE: 67.5,
  E: 90,
  ESE: 112.5,
  SE: 135,
  SSE: 157.5,
  S: 180,
  SSW: 202.5,
  SW: 225,
  WSW: 247.5,
  W: 270,
  WNW: 292.5,
  NW: 315,
  NNW: 337.5,
}

/**
 * Calcola l'elevazione e l'azimut astronomico del sole.
 * @param lat Latitudine in gradi decimali (es. 43.7 per Firenze)
 * @param dayOfYear Giorno dell'anno (1-365, default 196 ~ 15 Luglio)
 * @param hour Ora solare decimale (es. 13.5 per le 13:30)
 */
export function computeSolarPosition(lat: number, dayOfYear = 196, hour = 13) {
  const rad = (deg: number) => (deg * Math.PI) / 180
  const deg = (radVal: number) => (radVal * 180) / Math.PI

  // Declinazione solare (formula di Cooper)
  const declination = 23.45 * Math.sin(rad((360 / 365) * (284 + dayOfYear)))

  // Angolo orario (15 gradi per ora rispetto al mezzogiorno solare)
  const hourAngle = 15 * (hour - 12)

  const latRad = rad(lat)
  const decRad = rad(declination)
  const hRad = rad(hourAngle)

  // Elevazione solare
  const sinElevation =
    Math.sin(latRad) * Math.sin(decRad) +
    Math.cos(latRad) * Math.cos(decRad) * Math.cos(hRad)
  const elevationRad = Math.asin(Math.max(-1, Math.min(1, sinElevation)))
  const elevation = Math.max(0, deg(elevationRad))

  // Azimut solare (0 = Nord, 90 = Est, 180 = Sud, 270 = Ovest)
  let azimuth = 180
  if (elevation > 0.1) {
    const cosAz =
      (Math.sin(elevationRad) * Math.sin(latRad) - Math.sin(decRad)) /
      (Math.cos(elevationRad) * Math.cos(latRad))
    const clampedCos = Math.max(-1, Math.min(1, cosAz))
    const rawAz = deg(Math.acos(clampedCos))
    azimuth = hourAngle >= 0 ? 180 + rawAz : 180 - rawAz
  } else {
    azimuth = hourAngle >= 0 ? 270 : 90
  }

  return {
    elevation: Math.round(elevation * 10) / 10,
    azimuth: Math.round(((azimuth % 360) + 360) % 360),
  }
}

export interface BioclimaticResult {
  louverAngle: number // gradi inclinazione lamelle
  screens: {
    L: number // 0 (aperta) a 1 (chiusa)
    R: number
    F: number
    B: number
  }
  sunSide: 'F' | 'B' | 'L' | 'R' | null
  summary: string
}

/**
 * OTTIMIZZAZIONE BIOCLIMATICA ARQUATI:
 * Obbiettivo fondamentale: DARE COSTANTEMENTE OMBRA 100% A CHI STA SOTTO,
 * LASCIANDO PASSARE L'ARIA (VENTILAZIONE NATURALE CONVETTIVA E TRASVERSALE).
 *
 * 1. LAMELLE DEL TETTO:
 *    - Inclinazione ottica esatta che blocca ogni raggio solare diretto.
 *    - Le lamelle non vengono MAI chiuse a 0° (a meno che non piova), perché a 0°
 *      l'aria calda resta intrappolata creando un effetto serra asfissiante.
 *    - Con sole alto (>55°) le lamelle ruotano a 65°-78°: i raggi sono intercettati,
 *      mentre il calore sale spontaneamente per effetto camino verso l'esterno.
 *
 * 2. TENDE LATERALI:
 *    - Si attiva SOLO il lato direttamente esposto al sole radente (<45° elevazione).
 *    - La tenda scende al 65%-75%: protegge completamente la testa e il tavolo di chi è seduto,
 *      lasciando aperti i 60-80 cm inferiori per l'ingresso di brezza fresca a terra.
 *    - Gli altri 3 lati NON esposti al sole restano al 100% APERTI per consentire
 *      la ventilazione trasversale naturale (cross-ventilation).
 */
export function computeBioclimaticOptimization(
  sunElevation: number,
  sunAzimuth: number,
  pergolaFacingDeg = 180, // Default: Fronte (F) orientato a Sud (180°)
  isRain = false,
): BioclimaticResult {
  const screens = { L: 0, R: 0, F: 0, B: 0 }

  // Caso pioggia: chiusura ermetica impermeabile
  if (isRain) {
    return {
      louverAngle: 0,
      screens: { L: 0, R: 0, F: 0, B: 0 },
      sunSide: null,
      summary: 'Pioggia rilevata: lamelle chiuse ermeticamente a 0° con gocciolatoio attivo per tenuta stagna all’acqua.',
    }
  }

  // Notte / Sole sotto l'orizzonte
  if (sunElevation <= 2) {
    return {
      louverAngle: 45, // aperte per godersi la brezza notturna
      screens,
      sunSide: null,
      summary: 'Notte / Sole sotto l’orizzonte: lamelle aperte a 45° per favorire la brezza notturna; tende ritratte.',
    }
  }

  // Identificazione del lato della pergola esposto al sole
  // Convenzione pergola: F = fronte (verso sud a 180°), R = destra (est a 90°), L = sinistra (ovest a 270°), B = retro (nord a 0°)
  const relAz = ((sunAzimuth - pergolaFacingDeg + 540) % 360) - 180 // -180..+180
  let sunSide: 'F' | 'B' | 'L' | 'R' = 'F'

  if (Math.abs(relAz) <= 45) {
    sunSide = 'F' // Sole frontale
  } else if (relAz > 45 && relAz < 135) {
    sunSide = 'R' // Sole da destra (Est)
  } else if (relAz < -45 && relAz > -135) {
    sunSide = 'L' // Sole da sinistra (Ovest)
  } else {
    sunSide = 'B' // Sole dal retro (Nord)
  }

  // 1. Calcolo Inclinazione Lamelle per Ombra 100% + Effetto Camino
  let louverAngle = 65

  if (sunElevation >= 60) {
    // Sole a picco / Mezzogiorno estivo (60°-85°):
    // Inclinazione tra 70° e 78°: ombra totale sul pavimento e massima apertura verticale per far uscire l'aria calda
    louverAngle = 75
  } else if (sunElevation >= 45) {
    // Sole alto pomeridiano o di tarda mattinata (45°-60°):
    louverAngle = 65
  } else if (sunElevation >= 30) {
    // Sole medio (30°-45°):
    louverAngle = 50
  } else {
    // Sole radente mattutino o tardo pomeridiano (<30°):
    // Lamelle a 38° per intercettare la luce diagonale
    louverAngle = 38
  }

  // 2. Calcolo Tende Laterali (Schermatura senza soffocare)
  // Se il sole è sotto i 45°, i raggi tagliano sotto il tetto e colpiscono lateralmente.
  // Abbassiamo la tenda solo sul lato soleggiato a un livello (65%-75%) che copre l'altezza uomo/tavolo
  // mantenendo la fascia inferiore aperta per la brezza.
  if (sunElevation < 45 && sunElevation > 4) {
    let deployment = 0.7 // 70% discesa: ombra sul tavolo, 75cm liberi a terra
    if (sunElevation < 25) deployment = 0.78 // sole molto radente
    if (sunElevation < 12) deployment = 0.85 // tramonto/alba

    screens[sunSide] = deployment
  }

  // Genera la spiegazione bioclimatica
  const sideLabels: Record<'F' | 'B' | 'L' | 'R', string> = {
    F: 'Frontale',
    B: 'Posteriore',
    L: 'Sinistra (Ovest)',
    R: 'Destra (Est)',
  }

  const screenActiveText = screens[sunSide] > 0
    ? `Tenda ${sideLabels[sunSide]} abbassata al ${Math.round(screens[sunSide] * 100)}% per bloccare il sole radente, lasciando liberi i 70cm inferiori per il ricircolo d’aria a terra.`
    : `Sole alto (${sunElevation}°): i 4 lati rimangono al 100% aperti per consentire la massima brezza trasversale naturale.`

  const summary = `Ombra continua 100% & ventilazione: lamelle orientate a ${louverAngle}° per intercettare tutti i raggi diretti consentendo all'aria calda di salire per effetto camino. ${screenActiveText} Gli altri lati restano aperti per il passaggio dell'aria.`

  return {
    louverAngle,
    screens,
    sunSide,
    summary,
  }
}

export function computeOptimalLouverAngle(
  sunElevation: number,
  sunAzimuth: number,
  pergolaFacingDeg = 180,
  _shadePreference = 5,
): number {
  return computeBioclimaticOptimization(sunElevation, sunAzimuth, pergolaFacingDeg).louverAngle
}
