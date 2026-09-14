import { useState } from 'react'
import {
  Blinds,
  BrickWall,
  CloudSun,
  DoorOpen,
  Lightbulb,
  Moon,
  MoveHorizontal,
  Palette,
  Ruler,
  Sparkles,
  Sun,
  type LucideIcon
} from 'lucide-react'
import {
  useConfigSelector,
  set,
  setStep,
  reset
} from '../lib/store'
import {
  SIDE_KEYS,
  SIDE_LABEL,
  SideKey,
  SideSystem,
  Mounting,
  PergolaConfig,
  STRUCTURE_FINISHES,
  FABRIC_PRESETS,
  GLASS_PRESETS
} from '../lib/types'
import { generateSpecificationPdf, CapturedViews } from '../lib/pdfExport'
import { Icon } from './Icon'

const STEPS: Array<{ id: number; title: string; icon: LucideIcon }> = [
  { id: 0, title: 'Dimensioni', icon: Ruler },
  { id: 1, title: 'Tetto', icon: Blinds },
  { id: 2, title: 'Chiusure', icon: DoorOpen },
  { id: 3, title: 'Finiture', icon: Palette },
  { id: 4, title: 'Luce & Sole', icon: Sun }
]

const SYSTEM_OPTIONS: Array<{ id: SideSystem; label: string; desc: string }> = [
  { id: 'none', label: 'Libero', desc: 'Apertura completa senza chiusure' },
  { id: 'panel1', label: '1 Tenda', desc: 'Tenda a caduta singola motorizzata zip (Ombreggiante)' },
  { id: 'panel2', label: '2 Tende (Doppio Rullo)', desc: 'Esterna in Kristall trasparente + interna ombreggiante' },
  { id: 'glass', label: 'Vetrata', desc: 'Ante panoramiche in cristallo temperato' }
]

const MOUNTING_OPTIONS: Array<{ id: Mounting; label: string; desc: string; cols: string }> = [
  { id: 'free', label: 'Autoportante', desc: '4 colonne portanti a terra', cols: '4 colonne' },
  { id: 'wall1', label: 'Addossata 1 lato', desc: 'Ancorata a parete retrostante (2 colonne frontali)', cols: '2 colonne' },
  { id: 'wall2', label: 'Addossata ad angolo', desc: 'Ancorata a 2 pareti ad angolo (Posteriore e Sinistra)', cols: '1 colonna' },
  { id: 'wall_opposed', label: 'Addossata tra 2 pareti', desc: 'Ancorata tra pareti contrapposte (Sinistra e Destra)', cols: '0 colonne' }
]

export function Panel({
  onCaptureViews
}: {
  onCaptureViews?: () => Promise<CapturedViews>
}) {
  const cfg = useConfigSelector((s) => s)
  const [activeSide, setActiveSide] = useState<SideKey>('F')
  const [copied, setCopied] = useState(false)
  const [exporting, setExporting] = useState(false)

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2400)
    } catch {
      // Fallback
    }
  }

  const handleSnapshot = () => {
    const canvas = document.querySelector('canvas')
    if (!canvas) return
    const url = canvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = url
    a.download = `Pergola_Snapshot_${Date.now()}.png`
    a.click()
  }

  const handlePdfExport = async () => {
    setExporting(true)
    try {
      let views: CapturedViews | undefined
      if (onCaptureViews) {
        views = await onCaptureViews()
      }
      await generateSpecificationPdf(cfg, views)
    } catch (e) {
      console.error('PDF export error:', e)
    } finally {
      setExporting(false)
    }
  }

  const updateSide = (side: SideKey, patch: Partial<PergolaConfig['sides'][SideKey]>) => {
    const current = cfg.sides[side]
    let nextOpening = patch.opening !== undefined ? patch.opening : current.opening
    let nextOpeningExternal = patch.openingExternal !== undefined ? patch.openingExternal : (current.openingExternal ?? current.opening)
    if (patch.system === 'panel1' && nextOpening === 0) {
      nextOpening = 0.5
    }
    if (patch.system === 'panel2') {
      if (nextOpening === 0) nextOpening = 0.5
      if (nextOpeningExternal === 0) nextOpeningExternal = 0.5
    }

    set({
      sides: {
        ...cfg.sides,
        [side]: {
          ...current,
          ...patch,
          opening: nextOpening,
          openingExternal: nextOpeningExternal
        }
      }
    })
  }

  const currentSide = cfg.sides[activeSide]

  // Check if current side is attached to a wall
  const isWallSide = (side: SideKey) => {
    if (cfg.mounting === 'wall1' && side === 'B') return true
    if (cfg.mounting === 'wall2' && (side === 'B' || side === 'L')) return true
    if (cfg.mounting === 'wall_opposed' && (side === 'L' || side === 'R')) return true
    return false
  }

  const activeSideIsWall = isWallSide(activeSide)
  const activeSpan = (activeSide === 'F' || activeSide === 'B') ? cfg.width - 0.24 : cfg.depth - 0.24

  return (
    <aside className="glass-panel">
      {/* --- Top Minimal Utilities Bar --- */}
      <div className="panel-actions-bar">
        <div className="actions-left">
          <button
            className="action-icon-btn"
            onClick={handleShare}
            title="Copia link configurazione"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
            <span className="action-btn-text">{copied ? 'Copiato!' : 'Condividi'}</span>
          </button>

          <button
            className="action-icon-btn"
            onClick={handleSnapshot}
            title="Cattura screenshot HD"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            <span className="action-btn-text">Foto</span>
          </button>
        </div>

        <div className="actions-right">
          <button
            className="action-icon-btn primary"
            onClick={handlePdfExport}
            disabled={exporting}
            title="Genera e scarica scheda tecnica PDF completa"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="18" x2="12" y2="12" />
              <line x1="9" y1="15" x2="15" y2="15" />
            </svg>
            <span className="action-btn-text">{exporting ? 'PDF...' : 'Scheda PDF'}</span>
          </button>

          <button
            className="action-icon-btn reset"
            onClick={reset}
            title="Reimposta parametri iniziali"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
          </button>
        </div>
      </div>

      {/* --- Step Category Bar --- */}
      <nav className="panel-tabs">
        {STEPS.map((s) => (
          <button
            key={s.id}
            className={`tab-btn ${cfg.activeStep === s.id ? 'active' : ''}`}
            onClick={() => setStep(s.id)}
            title={s.title}
          >
            <span className="tab-icon">
              <Icon icon={s.icon} size={15} />
            </span>
            <span className="tab-title">{s.title}</span>
          </button>
        ))}
      </nav>

      {/* --- Main Configuration Body --- */}
      <div className="panel-body">
        {/* ================= STEP 0: DIMENSIONI & TIPOLOGIA ================= */}
        {cfg.activeStep === 0 && (
          <div className="step-content">
            <div className="section-header">
              <h3>Dimensioni e Tipologia</h3>
              <p>Personalizza l'ingombro modulare e la tipologia di ancoraggio a parete o a terra.</p>
            </div>

            <div className="control-card">
              <div className="slider-row">
                <div className="row-meta">
                  <span className="row-name">Larghezza (L)</span>
                  <span className="row-val">{cfg.width.toFixed(2)} m</span>
                </div>
                <input
                  type="range"
                  min={2.5}
                  max={7.5}
                  step={0.1}
                  value={cfg.width}
                  onChange={(e) => set({ width: parseFloat(e.target.value) })}
                />
                <div className="slider-limits">
                  <span>2.5 m</span>
                  <span>7.5 m</span>
                </div>
              </div>

              <div className="slider-row" style={{ marginTop: '0.8rem' }}>
                <div className="row-meta">
                  <span className="row-name">Profondità (P)</span>
                  <span className="row-val">{cfg.depth.toFixed(2)} m</span>
                </div>
                <input
                  type="range"
                  min={2.5}
                  max={6.5}
                  step={0.1}
                  value={cfg.depth}
                  onChange={(e) => set({ depth: parseFloat(e.target.value) })}
                />
                <div className="slider-limits">
                  <span>2.5 m</span>
                  <span>6.5 m</span>
                </div>
              </div>

              <div className="slider-row" style={{ marginTop: '0.8rem' }}>
                <div className="row-meta">
                  <span className="row-name">Altezza Sottotrave (H)</span>
                  <span className="row-val">{cfg.height.toFixed(2)} m</span>
                </div>
                <input
                  type="range"
                  min={2.0}
                  max={3.2}
                  step={0.05}
                  value={cfg.height}
                  onChange={(e) => set({ height: parseFloat(e.target.value) })}
                />
                <div className="slider-limits">
                  <span>2.0 m</span>
                  <span>3.2 m</span>
                </div>
              </div>
            </div>

            <div className="section-header" style={{ marginTop: '1.4rem' }}>
              <h4>Tipologia di Installazione</h4>
            </div>

            <div className="cards-grid">
              {MOUNTING_OPTIONS.map((m) => (
                <div
                  key={m.id}
                  className={`choice-card ${cfg.mounting === m.id ? 'active' : ''}`}
                  onClick={() => set({ mounting: m.id })}
                >
                  <div className="choice-header">
                    <span className="choice-title">{m.label}</span>
                    <span className="badge-cols">{m.cols}</span>
                  </div>
                  <p className="choice-desc">{m.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= STEP 1: TETTO A LAMELLE ================= */}
        {cfg.activeStep === 1 && (
          <div className="step-content">
            <div className="section-header">
              <h3>Tetto Bioclimatico a Lamelle</h3>
              <p>Orienta le pale in alluminio per la schermatura solare o impacchetta a cielo aperto.</p>
            </div>

            <div className="control-card">
              <div className="toggle-banner">
                <div>
                  <div className="banner-title">Impacchettamento Tetto</div>
                  <div className="banner-subtitle">
                    {cfg.louverPacked
                      ? 'Lamelle verticali raccolte a pacchetto: cielo aperto'
                      : 'Lamelle distribuite sull’intera profondità'}
                  </div>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={cfg.louverPacked}
                    onChange={(e) => set({ louverPacked: e.target.checked })}
                  />
                  <span className="slider round" />
                </label>
              </div>

              {!cfg.louverPacked ? (
                <div className="slider-row" style={{ marginTop: '1.2rem' }}>
                  <div className="row-meta">
                    <span className="row-name">Inclinazione Lamelle</span>
                    <span className="row-val">{cfg.louverAngle}°</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={180}
                    step={1}
                    value={cfg.louverAngle}
                    onChange={(e) => set({ louverAngle: parseInt(e.target.value, 10) })}
                  />
                  <div className="slider-limits">
                    <span>0° (Chiuso ermetico)</span>
                    <span>90° (Frangisole)</span>
                    <span>180° (Aperto)</span>
                  </div>
                </div>
              ) : (
                <div className="info-box success" style={{ marginTop: '1rem' }}>
                  <span className="info-icon">
                    <Icon icon={Sparkles} size={14} />
                  </span>
                  <span>
                    In modalità impacchettamento le lamelle si orientano a 90° e traslano a pacchetto verso il traverso posteriore, liberando completamente il cielo.
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= STEP 2: CHIUSURE PERIMETRALI ================= */}
        {cfg.activeStep === 2 && (
          <div className="step-content">
            <div className="section-header">
              <h3>Chiusure Perimetrali</h3>
              <p>Configura indipendentemente ciascuno dei 4 lati con tende a caduta zip o vetrate.</p>
            </div>

            {/* Side selector tabs */}
            <div className="subtabs-bar">
              {SIDE_KEYS.map((k) => {
                const wallSide = isWallSide(k)
                return (
                  <button
                    key={k}
                    className={`subtab-btn ${activeSide === k ? 'active' : ''}`}
                    onClick={() => setActiveSide(k)}
                  >
                    <span className="subtab-key">{k}</span>
                    <span className="subtab-name">{SIDE_LABEL[k]}</span>
                    {wallSide && <span className="wall-indicator">Parete</span>}
                  </button>
                )
              })}
            </div>

            {activeSideIsWall ? (
              <div className="control-card">
                <div className="info-box">
                  <span className="info-icon">
                    <Icon icon={BrickWall} size={14} />
                  </span>
                  <span>
                    Il lato <b>{SIDE_LABEL[activeSide]}</b> è ancorato alla parete strutturale dell'edificio. Non richiede chiusure perimetrali.
                  </span>
                </div>
              </div>
            ) : (
              <div className="control-card">
                <div className="side-system-selector">
                  <span className="label-caption">Sistema di chiusura per lato {SIDE_LABEL[activeSide]}:</span>
                  <div className="cards-grid">
                    {SYSTEM_OPTIONS.map((opt) => (
                      <div
                        key={opt.id}
                        className={`choice-card compact ${currentSide.system === opt.id ? 'active' : ''}`}
                        onClick={() => updateSide(activeSide, { system: opt.id })}
                      >
                        <div className="choice-header">
                          <span className="choice-title">{opt.label}</span>
                        </div>
                        <p className="choice-desc">{opt.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Controls specific to Screens */}
                {currentSide.system === 'panel1' && (
                  <div className="sub-options">
                    <div className="slider-row" style={{ marginTop: '0.9rem' }}>
                      <div className="row-meta">
                        <span className="row-name">Discesa Tenda Ombreggiante</span>
                        <span className="row-val">{Math.round(currentSide.opening * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.02}
                        value={currentSide.opening}
                        onChange={(e) => updateSide(activeSide, { opening: parseFloat(e.target.value) })}
                      />
                      <div className="slider-limits">
                        <span>0% (Raccolta nel cassonetto)</span>
                        <span>100% (Completamente a terra)</span>
                      </div>
                    </div>
                  </div>
                )}

                {currentSide.system === 'panel2' && (
                  <div className="sub-options">
                    {/* Slider 1: External Clear PVC Kristall Screen */}
                    <div className="slider-row" style={{ marginTop: '0.6rem' }}>
                      <div className="row-meta">
                        <span className="row-name row-name-with-icon">
                          <Icon icon={Blinds} size={13} />
                          Tenda Esterna (PVC Kristall Trasparente)
                        </span>
                        <span className="row-val">{Math.round((currentSide.openingExternal ?? currentSide.opening) * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.02}
                        value={currentSide.openingExternal ?? currentSide.opening}
                        onChange={(e) => updateSide(activeSide, { openingExternal: parseFloat(e.target.value) })}
                      />
                      <div className="slider-limits">
                        <span>0% (Raccolta)</span>
                        <span>100% (A terra)</span>
                      </div>
                    </div>

                    {/* Slider 2: Internal Shade Fabric Screen */}
                    <div className="slider-row" style={{ marginTop: '1rem' }}>
                      <div className="row-meta">
                        <span className="row-name row-name-with-icon">
                          <Icon icon={Sun} size={13} />
                          Tenda Interna (Tessuto Ombreggiante)
                        </span>
                        <span className="row-val">{Math.round(currentSide.opening * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.02}
                        value={currentSide.opening}
                        onChange={(e) => updateSide(activeSide, { opening: parseFloat(e.target.value) })}
                      />
                      <div className="slider-limits">
                        <span>0% (Raccolta)</span>
                        <span>100% (A terra)</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Controls specific to Glass */}
                {currentSide.system === 'glass' && (
                  <div className="sub-options">
                    <div className="option-row">
                      <span className="option-label">Meccanismo Apertura:</span>
                      <div className="pill-group">
                        <button
                          className={`pill-btn ${currentSide.glassOpen === 'center' ? 'active' : ''}`}
                          onClick={() => updateSide(activeSide, { glassOpen: 'center' })}
                        >
                          <Icon icon={DoorOpen} size={13} />
                          {activeSpan >= 3.5 ? 'Doppia porta centrale' : 'Porta centrale singola'}
                        </button>
                        <button
                          className={`pill-btn ${currentSide.glassOpen === 'accordion' ? 'active' : ''}`}
                          onClick={() => updateSide(activeSide, { glassOpen: 'accordion' })}
                        >
                          <Icon icon={MoveHorizontal} size={13} />
                          Scorrevole a pacchetto
                        </button>
                      </div>
                    </div>

                    <div className="slider-row" style={{ marginTop: '0.9rem' }}>
                      <div className="row-meta">
                        <span className="row-name">Apertura Vetrata</span>
                        <span className="row-val">{Math.round(currentSide.opening * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.02}
                        value={currentSide.opening}
                        onChange={(e) => updateSide(activeSide, { opening: parseFloat(e.target.value) })}
                      />
                      <div className="slider-limits">
                        <span>0% (Chiusa)</span>
                        <span>100% (Completamente aperta)</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ================= STEP 3: FINITURE & COLORI ================= */}
        {cfg.activeStep === 3 && (
          <div className="step-content">
            <div className="section-header">
              <h3>Finiture Architettoniche</h3>
              <p>Seleziona i trattamenti superficiali per profili in alluminio, tessuti schermanti e cristalli.</p>
            </div>

            <div className="control-card">
              <span className="label-caption">Verniciatura Struttura e Profili (Alluminio Termolaccato):</span>
              <div className="swatches-grid-large">
                {STRUCTURE_FINISHES.map((f) => {
                  const isActive = cfg.colors.structure.toLowerCase() === f.hex.toLowerCase()
                  return (
                    <button
                      key={f.id}
                      className={`swatch-card-large ${isActive ? 'active' : ''}`}
                      onClick={() =>
                        set({
                          colors: {
                            ...cfg.colors,
                            structure: f.hex,
                            structureRoughness: f.roughness,
                            structureMetalness: f.metalness
                          }
                        })
                      }
                    >
                      <span className="swatch-circle-large" style={{ backgroundColor: f.hex }} />
                      <div className="swatch-text-group">
                        <span className="swatch-name-large">{f.name}</span>
                      </div>
                    </button>
                  )
                })}
              </div>

              <div className="color-custom-row">
                <span className="label-caption">Oppure inserisci colore RAL personalizzato:</span>
                <input
                  type="color"
                  value={cfg.colors.structure}
                  onChange={(e) =>
                    set({
                      colors: {
                        ...cfg.colors,
                        structure: e.target.value,
                        structureRoughness: 0.35,
                        structureMetalness: 0.2
                      }
                    })
                  }
                />
              </div>

              <div className="divider" />

              <span className="label-caption">Tessuto Chiusure Verticali Zip:</span>
              <div className="swatches-grid-large">
                {FABRIC_PRESETS.map((fb) => {
                  const isActive = cfg.colors.fabric.toLowerCase() === fb.hex.toLowerCase()
                  return (
                    <button
                      key={fb.id}
                      className={`swatch-card-large ${isActive ? 'active' : ''}`}
                      onClick={() => set({ colors: { ...cfg.colors, fabric: fb.hex } })}
                    >
                      <span className="swatch-circle-large" style={{ backgroundColor: fb.hex }} />
                      <div className="swatch-text-group">
                        <span className="swatch-name-large">{fb.name}</span>
                      </div>
                    </button>
                  )
                })}
              </div>

              <div className="divider" />

              <span className="label-caption">Tonalità Cristallo Panoramico:</span>
              <div className="swatches-grid-large">
                {GLASS_PRESETS.map((g) => {
                  const isActive = cfg.colors.glass.toLowerCase() === g.hex.toLowerCase()
                  return (
                    <button
                      key={g.id}
                      className={`swatch-card-large ${isActive ? 'active' : ''}`}
                      onClick={() =>
                        set({
                          colors: {
                            ...cfg.colors,
                            glass: g.hex,
                            glassTransmission: g.transmission,
                            glassOpacity: g.opacity
                          }
                        })
                      }
                    >
                      <span className="swatch-circle-large" style={{ backgroundColor: g.hex }} />
                      <div className="swatch-text-group">
                        <span className="swatch-name-large">{g.name}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ================= STEP 4: ILLUMINAZIONE & SOLE ================= */}
        {cfg.activeStep === 4 && (
          <div className="step-content">
            <div className="section-header">
              <h3>Illuminazione & Atmosfera</h3>
              <p>Alterna tra luce studio e luce naturale, simulando l'orientamento solare e i LED integrati.</p>
            </div>

            <div className="control-card">
              {/* Lighting Mode Selector */}
              <div className="option-row" style={{ marginBottom: '1.2rem' }}>
                <span className="label-caption">Modalità Illuminazione Scena:</span>
                <div className="pill-group">
                  <button
                    className={`pill-btn ${cfg.lightingMode === 'studio' ? 'active' : ''}`}
                    onClick={() => set({ lightingMode: 'studio' })}
                  >
                    <Icon icon={Lightbulb} size={13} />
                    Studio Fotografico
                  </button>
                  <button
                    className={`pill-btn ${cfg.lightingMode === 'environment' ? 'active' : ''}`}
                    onClick={() => set({ lightingMode: 'environment' })}
                  >
                    <Icon icon={CloudSun} size={13} />
                    Luce Cielo / Ambiente
                  </button>
                </div>
              </div>

              {/* Integrated LED Lighting Controls */}
              <div className="section-header" style={{ marginBottom: '8px' }}>
                <h4>Sistemi LED Integrati (3000K Bianco Caldo)</h4>
              </div>

              {/* LED Trave */}
              <div className="toggle-banner" style={{ marginBottom: '8px' }}>
                <div>
                  <div className="banner-title">LED Trave Perimetrale</div>
                  <div className="banner-subtitle">
                    {cfg.ledBeam ? 'Illuminazione perimetrale trave accesa' : 'Spenta'}
                  </div>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={cfg.ledBeam}
                    onChange={(e) => set({ ledBeam: e.target.checked, autoLed: false })}
                  />
                  <span className="slider round" />
                </label>
              </div>

              {/* LED Colonna Esterno */}
              <div className="toggle-banner" style={{ marginBottom: '10px' }}>
                <div>
                  <div className="banner-title">LED Colonna Esterno</div>
                  <div className="banner-subtitle">
                    {cfg.ledColumn ? 'Strisce verticali d’angolo accese' : 'Spente'}
                  </div>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={cfg.ledColumn}
                    onChange={(e) => set({ ledColumn: e.target.checked, autoLed: false })}
                  />
                  <span className="slider round" />
                </label>
              </div>

              {/* Quick Pill Controls */}
              <div className="pill-group" style={{ marginBottom: '1.2rem' }}>
                <button
                  className={`pill-btn ${cfg.ledBeam && cfg.ledColumn ? 'active' : ''}`}
                  onClick={() => set({ ledBeam: true, ledColumn: true, autoLed: false })}
                >
                  Accendi Entrambi
                </button>
                <button
                  className={`pill-btn ${!cfg.ledBeam && !cfg.ledColumn ? 'active' : ''}`}
                  onClick={() => set({ ledBeam: false, ledColumn: false, autoLed: false })}
                >
                  Spegni Tutti
                </button>
              </div>

              {/* Sun Elevation Slider */}
              <div className="slider-row" style={{ marginTop: '1.2rem' }}>
                <div className="row-meta">
                  <span className="row-name">Altezza Sole (Elevazione)</span>
                  <span className="row-val row-val-with-icon">
                    {cfg.sun.elevation}°
                    <Icon icon={cfg.sun.elevation <= 18 ? Moon : Sun} size={12} />
                    {cfg.sun.elevation <= 18 ? 'Notte / Tramonto' : 'Giorno'}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={85}
                  step={1}
                  value={cfg.sun.elevation}
                  onChange={(e) =>
                    set({
                      sun: { ...cfg.sun, elevation: parseInt(e.target.value, 10) }
                    })
                  }
                />
                <div className="slider-limits">
                  <span>0° (Notte)</span>
                  <span>45° (Pomeriggio)</span>
                  <span>85° (Mezzogiorno)</span>
                </div>
              </div>

              {/* Sun Azimuth Slider */}
              <div className="slider-row" style={{ marginTop: '0.8rem' }}>
                <div className="row-meta">
                  <span className="row-name">Direzione Sole (Azimut)</span>
                  <span className="row-val">{cfg.sun.azimuth}°</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={360}
                  step={2}
                  value={cfg.sun.azimuth}
                  onChange={(e) =>
                    set({
                      sun: { ...cfg.sun, azimuth: parseInt(e.target.value, 10) }
                    })
                  }
                />
                <div className="slider-limits">
                  <span>0° (Nord)</span>
                  <span>90° (Est)</span>
                  <span>180° (Sud)</span>
                  <span>270° (Ovest)</span>
                </div>
              </div>

              <div className="info-box" style={{ marginTop: '1rem' }}>
                <span className="info-icon">
                  <Icon icon={Sun} size={14} />
                </span>
                <span>
                  Al calare del sole verso l'orizzonte o la notte, le strip LED sottotrave si attivano creando un'atmosfera calda e accogliente proiettata a terra.
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}