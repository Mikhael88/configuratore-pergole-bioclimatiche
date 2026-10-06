import { useState, useEffect, useRef } from 'react'
import { Sparkles, Play, Pause, Sun, MapPin, Compass, ShieldAlert, CheckCircle2 } from 'lucide-react'
import { set, useConfigSelector } from '../lib/store'
import {
  analyzeTerraceScenario,
  type TypeSafeAnalysisResult,
} from '../lib/typesafe'
import { computeSolarPosition, computeBioclimaticOptimization } from '../lib/solar'

const PRESETS = [
  {
    title: 'Firenze • Sud-Est',
    desc: 'Pranzo estivo a picco, massimo comfort',
    prompt:
      'Abito a Firenze, la mia pergola è orientata a Sud-Est. Vogliamo pranzare fuori a luglio senza essere accecati o soffocare dal caldo.',
  },
  {
    title: 'Milano • Ovest',
    desc: 'Aperitivo serale con sole radente al tramonto',
    prompt:
      'Terrazzo a Milano orientato a Ovest, ore 19:30 aperitivo con amici. Il sole è basso e radente, vogliamo luce calda ma senza abbagliamento.',
  },
  {
    title: 'Sicilia • Sud',
    desc: 'Piena estate mediterranea, sole zenitale',
    prompt:
      'Villa al mare in Sicilia orientata a Sud. Sole fortissimo delle ore 14:00, serve massima schermatura termica e ventilazione.',
  },
  {
    title: 'Temporale Estivo',
    desc: 'Pioggia improvvisa con vento',
    prompt:
      'È arrivato un forte temporale estivo improvviso con pioggia battente e vento.',
  },
]

export default function AiSolarAssistant() {
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<TypeSafeAnalysisResult | null>(null)

  // Daylight simulation state
  const [currentHour, setCurrentHour] = useState<number>(13)
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const playTimerRef = useRef<number | null>(null)

  const cfg = useConfigSelector((s) => s)

  // Applica il risultato di TypeSafe allo store Zustand
  const applyAnalysis = (res: TypeSafeAnalysisResult) => {
    setResult(res)
    setCurrentHour(res.targetHour)

    const updatedSides = { ...cfg.sides }
    if (res.recommendedScreens.F > 0) {
      updatedSides.F = {
        ...updatedSides.F,
        system: 'panel1',
        opening: res.recommendedScreens.F,
      }
    }
    if (res.recommendedScreens.L > 0) {
      updatedSides.L = {
        ...updatedSides.L,
        system: 'panel1',
        opening: res.recommendedScreens.L,
      }
    }
    if (res.recommendedScreens.R > 0) {
      updatedSides.R = {
        ...updatedSides.R,
        system: 'panel1',
        opening: res.recommendedScreens.R,
      }
    }

    set({
      sun: {
        azimuth: res.solar.azimuth,
        elevation: res.solar.elevation,
      },
      louverAngle: res.recommendedLouverAngle,
      louverPacked: false,
      led: res.needsLed,
      ledBeam: res.needsLed,
      ledColumn: res.needsLed,
      sides: updatedSides,
    })
  }

  const handleAnalyze = async (textToAnalyze?: string) => {
    const q = (textToAnalyze || prompt).trim()
    if (!q) return

    setLoading(true)
    setError(null)

    try {
      const res = await analyzeTerraceScenario(q)
      applyAnalysis(res)
    } catch (err: any) {
      console.error('TypeSafe error:', err)
      setError(err.message || 'Errore durante la chiamata a TypeSafe.')
    } finally {
      setLoading(false)
    }
  }

  // Simulazione oraria del sole (scrubber continuo)
  const handleHourChange = (newHour: number) => {
    setCurrentHour(newHour)
    const lat = result ? result.lat : 43.77
    const bearing = result ? result.orientationBearing : 180

    const solar = computeSolarPosition(lat, 196, newHour)
    const isRain = result ? result.isRain : false
    const bio = computeBioclimaticOptimization(
      solar.elevation,
      solar.azimuth,
      bearing,
      isRain,
    )

    const updatedSides = { ...cfg.sides }
    // Attivazione tenda solo sul lato esposto al sole (65-75% per consentire brezza a terra), altri lati 100% aperti
    updatedSides.F = {
      ...updatedSides.F,
      system: bio.screens.F > 0 ? 'panel1' : 'none',
      opening: bio.screens.F > 0 ? bio.screens.F : 0,
    }
    updatedSides.L = {
      ...updatedSides.L,
      system: bio.screens.L > 0 ? 'panel1' : 'none',
      opening: bio.screens.L > 0 ? bio.screens.L : 0,
    }
    updatedSides.R = {
      ...updatedSides.R,
      system: bio.screens.R > 0 ? 'panel1' : 'none',
      opening: bio.screens.R > 0 ? bio.screens.R : 0,
    }
    updatedSides.B = {
      ...updatedSides.B,
      system: bio.screens.B > 0 ? 'panel1' : 'none',
      opening: bio.screens.B > 0 ? bio.screens.B : 0,
    }

    set({
      sun: {
        azimuth: solar.azimuth,
        elevation: solar.elevation,
      },
      louverAngle: bio.louverAngle,
      sides: updatedSides,
    })
  }

  // Play/Pause loop per animare l'arco solare della giornata
  useEffect(() => {
    if (isPlaying) {
      playTimerRef.current = window.setInterval(() => {
        setCurrentHour((prev) => {
          const next = prev + 0.25
          const wrapped = next > 20.5 ? 7.5 : next
          handleHourChange(wrapped)
          return wrapped
        })
      }, 100)
    } else if (playTimerRef.current) {
      clearInterval(playTimerRef.current)
      playTimerRef.current = null
    }
    return () => {
      if (playTimerRef.current) clearInterval(playTimerRef.current)
    }
  }, [isPlaying, result])

  const formatHour = (h: number) => {
    const whole = Math.floor(h)
    const mins = Math.round((h % 1) * 60)
    return `${whole.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
  }

  return (
    <div className="ai-panel-card">
      <div className="ai-panel-header">
        <div className="ai-panel-title">
          <Sparkles className="ai-sparkle-icon" size={18} />
          <h4>TypeSafe™ AI — Allineamento Solare</h4>
        </div>
        <span className="ai-model-tag">Jev System One</span>
      </div>

      <div className="ai-bioclimatic-principle-badge">
        <span className="ai-bio-dot" />
        <span><b>Obiettivo Bioclimatico:</b> Ombra continua 100% sotto la pergola + massima ventilazione d'aria</span>
      </div>

      <p className="ai-panel-desc">
        Descrivi il tuo <b>indirizzo</b>, l'<b>orientamento</b> o uno <b>scenario d'uso</b>: il modello calcola in tempo reale la posizione solare astronomica e orienta le lamelle bioclimatiche.
      </p>

      {/* Input Chatbox */}
      <div className="ai-chatbox">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="es. Abito a Firenze, terrazzo a Sud-Est, vogliamo pranzare fuori alle 13:00 senza sole accecante..."
          rows={3}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleAnalyze()
            }
          }}
        />
        <button
          className="ai-chat-btn"
          onClick={() => handleAnalyze()}
          disabled={loading || !prompt.trim()}
        >
          {loading ? (
            <span className="ai-spinner-blue" />
          ) : (
            <>
              <Sparkles size={14} />
              <span>Allinea Pergola al Sole</span>
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="ai-error-message">
          <ShieldAlert size={15} />
          <span>{error}</span>
        </div>
      )}

      {/* Quick Scenario Chips */}
      <div className="ai-chips-group">
        <span className="ai-chips-title">Scenari rapidi pronti:</span>
        <div className="ai-chips-row">
          {PRESETS.map((p, idx) => (
            <button
              key={idx}
              className="ai-chip-button"
              onClick={() => {
                setPrompt(p.prompt)
                handleAnalyze(p.prompt)
              }}
              disabled={loading}
              title={p.desc}
            >
              {p.title}
            </button>
          ))}
        </div>
      </div>

      {/* Results Box */}
      {result && (
        <div className="ai-response-box">
          <div className="ai-badges-row">
            <span className="ai-metric-badge">
              <MapPin size={11} />
              {result.location}
            </span>
            <span className="ai-metric-badge">
              <Compass size={11} />
              {result.orientation} ({result.orientationBearing}°)
            </span>
            <span className="ai-metric-badge">
              <Sun size={11} />
              {result.solar.elevation}° el / {result.solar.azimuth}° az
            </span>
            <span className="ai-metric-badge highlight">
              <CheckCircle2 size={11} />
              Lamelle: {result.recommendedLouverAngle}°
            </span>
          </div>
          <p className="ai-explanation-text">{result.summary}</p>
        </div>
      )}

      {/* Daylight Simulation Scrubber */}
      <div className="ai-simulation-box">
        <div className="ai-simulation-header">
          <span className="ai-sim-title">
            Simulazione Arco Solare ({result ? result.location : 'Lat. 43.8° N'}):
          </span>
          <span className="ai-sim-clock">
            {formatHour(currentHour)}
          </span>
        </div>

        <div className="ai-simulation-row">
          <button
            className={`ai-sim-play ${isPlaying ? 'active' : ''}`}
            onClick={() => setIsPlaying(!isPlaying)}
          >
            {isPlaying ? <Pause size={13} /> : <Play size={13} />}
            <span>{isPlaying ? 'Pausa' : 'Avvia Simulazione'}</span>
          </button>

          <input
            type="range"
            min={7.5}
            max={20.5}
            step={0.1}
            value={currentHour}
            onChange={(e) => handleHourChange(parseFloat(e.target.value))}
            className="ai-sim-slider"
          />
        </div>
        <div className="ai-sim-labels">
          <span>08:00 Mattina</span>
          <span>13:00 Mezzogiorno</span>
          <span>17:00 Pomeriggio</span>
          <span>20:00 Tramonto</span>
        </div>
      </div>
    </div>
  )
}
