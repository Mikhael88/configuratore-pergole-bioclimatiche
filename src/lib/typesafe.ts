import { computeBioclimaticOptimization, computeSolarPosition, KNOWN_LOCATIONS, COMPASS_BEARINGS } from './solar'

export interface TypeSafeAnalysisResult {
  location: string
  lat: number
  lon: number
  orientation: string
  orientationBearing: number
  timeOfDay: 'morning' | 'lunch' | 'afternoon' | 'sunset' | 'dinner'
  targetHour: number
  shadeDemand: number
  solar: {
    azimuth: number
    elevation: number
  }
  recommendedLouverAngle: number
  recommendedScreens: {
    L: number
    R: number
    F: number
    B: number
  }
  needsLed: boolean
  isRain: boolean
  summary: string
}

export async function analyzeTerraceScenario(
  prompt: string,
  apiKey?: string,
): Promise<TypeSafeAnalysisResult> {
  const token = apiKey || import.meta.env.VITE_TYPESAFE_API_KEY

  if (!token) {
    throw new Error('TypeSafe API token is missing. Please provide a valid token.')
  }

  const payload = {
    state: prompt,
    model: 'jev-latest',
    questions: {
      orientation: {
        type: 'choice',
        instructions: 'Which compass direction is the pergola or terrace facing?',
        criteria: {
          N: 'Facing North',
          NE: 'Facing North-East',
          E: 'Facing East',
          SE: 'Facing South-East',
          S: 'Facing South',
          SW: 'Facing South-West',
          W: 'Facing West',
          NW: 'Facing North-West',
        },
      },
      location_name: {
        type: 'choice',
        instructions: 'Which Italian or European city or region is mentioned or closest?',
        criteria: {
          Firenze: 'Florence / Tuscany',
          Milano: 'Milan / Lombardy',
          Roma: 'Rome / Lazio',
          Napoli: 'Naples / Campania',
          Palermo: 'Palermo / Sicily',
          Torino: 'Turin / Piedmont',
          Venezia: 'Venice / Veneto',
          Bologna: 'Bologna / Emilia-Romagna',
          Bari: 'Bari / Puglia',
          Genova: 'Genoa / Liguria',
          Verona: 'Verona / Veneto',
          Paris: 'Paris / France',
          Madrid: 'Madrid / Spain',
          London: 'London / UK',
          Berlin: 'Berlin / Germany',
          Other: 'Other or unspecified location',
        },
      },
      time_of_day: {
        type: 'choice',
        instructions: 'What time of day or meal scenario is described?',
        criteria: {
          morning: 'Morning breakfast or early hours (8:00 - 11:30)',
          lunch: 'Lunch or midday sun (12:00 - 14:30)',
          afternoon: 'Afternoon sun, tea, relax (15:00 - 18:00)',
          sunset: 'Aperitivo, late afternoon or sunset (18:30 - 20:30)',
          dinner: 'Dinner, evening, or night party (21:00+)',
        },
      },
      shade_demand: {
        type: 'score',
        instructions: 'How much shade and cooling heat protection does the user want?',
        criteria: [
          'Wants full direct sun or open sky',
          'Wants gentle partial sun',
          'Wants standard balanced shade',
          'Wants strong sun protection with ventilation',
          'Wants maximum cooling shade and heat blocking',
        ],
      },
      glare_side: {
        type: 'choice',
        instructions: 'Which side needs screen protection from low sun, wind, or privacy?',
        criteria: {
          none: 'No vertical screen needed',
          front: 'Front side facing forward',
          left: 'Left side',
          right: 'Right side',
          all: 'Full perimeter screens',
        },
      },
      needs_led: {
        type: 'noul',
        instructions: 'Does the scenario suggest evening, sunset, dinner, or night where LED lights are needed?',
      },
      rain_protection: {
        type: 'noul',
        instructions: 'Is rain, storm, or wet weather mentioned requiring a closed waterproof roof?',
      },
    },
  }

  // Use Vite proxy endpoint to avoid browser CORS restrictions
  const endpoint = '/api/typesafe/v1/systemone'

  let response: Response
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
  } catch (netErr) {
    // If local proxy fails, attempt direct fetch as fallback
    response = await fetch('https://api.typesafe.ai/v1/systemone', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
  }

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`TypeSafe API request failed (${response.status}): ${errText}`)
  }

  const data = await response.json()
  const ans = data.answers || {}

  const orientation = (ans.orientation?.choice as string) || 'SE'
  const orientationBearing = COMPASS_BEARINGS[orientation] ?? 135

  const locationRaw = (ans.location_name?.choice as string) || 'Firenze'
  const locKey = locationRaw.toLowerCase()
  const locCoords = KNOWN_LOCATIONS[locKey] || { name: locationRaw, lat: 43.77, lon: 11.25 }

  const timeOfDay = (ans.time_of_day?.choice as any) || 'lunch'
  let targetHour = 13
  if (timeOfDay === 'morning') targetHour = 9.5
  else if (timeOfDay === 'lunch') targetHour = 13.0
  else if (timeOfDay === 'afternoon') targetHour = 16.5
  else if (timeOfDay === 'sunset') targetHour = 19.5
  else if (timeOfDay === 'dinner') targetHour = 21.5

  const shadeDemand = Math.max(1, Math.min(5, Math.round((ans.shade_demand?.score ?? 3) + 1)))
  const needsLed = (ans.needs_led?.noul ?? 0) > 0.45
  const isRain = (ans.rain_protection?.noul ?? 0) > 0.45

  // Calcolo solare per la data estiva canonica (15 Luglio = giorno 196)
  const solar = computeSolarPosition(locCoords.lat, 196, targetHour)

  // Calcolo bioclimatico: 100% ombra continua a terra + massima ventilazione convettiva e trasversale
  const bio = computeBioclimaticOptimization(
    solar.elevation,
    solar.azimuth,
    orientationBearing,
    isRain,
  )

  const recommendedLouverAngle = bio.louverAngle
  const recommendedScreens = bio.screens

  // Se TypeSafe ha rilevato un riverbero laterale specifico aggiuntivo richiesto dall'utente
  const glareChoice = ans.glare_side?.choice || 'none'
  if (glareChoice === 'front' && recommendedScreens.F === 0 && solar.elevation < 50) recommendedScreens.F = 0.72
  if (glareChoice === 'left' && recommendedScreens.L === 0 && solar.elevation < 50) recommendedScreens.L = 0.72
  if (glareChoice === 'right' && recommendedScreens.R === 0 && solar.elevation < 50) recommendedScreens.R = 0.72

  // Genera spiegazione chiara focalizzata su Ombra + Passaggio d'aria
  let summary = ''
  if (isRain) {
    summary = `🌧️ Temporale rilevato: lamelle chiuse ermeticamente a 0° con gocciolatoio attivo per tenuta stagna all'acqua.`
  } else if (targetHour >= 21) {
    summary = `🌙 Notte a ${locCoords.name}: sole sotto l'orizzonte; lamelle aperte a 45° per godere della brezza serale e strip LED accese.`
  } else {
    summary = `🌿 Principio Bioclimatico (Ombra 100% + Passaggio d'Aria): A ${locCoords.name} alle ${Math.floor(targetHour)}:${targetHour % 1 ? '30' : '00'} (fronte ${orientation}), ${bio.summary}`
  }

  return {
    location: locCoords.name,
    lat: locCoords.lat,
    lon: locCoords.lon,
    orientation,
    orientationBearing,
    timeOfDay,
    targetHour,
    shadeDemand,
    solar,
    recommendedLouverAngle,
    recommendedScreens,
    needsLed,
    isRain,
    summary,
  }
}
