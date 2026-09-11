import { useState } from 'react'
import { useConfigSelector, reset } from '../lib/store'
import { generateSpecificationPdf, CapturedViews } from '../lib/pdfExport'

export function TopBar({
  onCaptureViews
}: {
  onCaptureViews?: () => Promise<CapturedViews>
}) {
  const cfg = useConfigSelector((s) => s)
  const [copied, setCopied] = useState(false)
  const [exporting, setExporting] = useState(false)

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
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

  return (
    <header className="top-bar">
      <div className="top-brand">
        <div className="brand-badge">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 21h18M5 21V5a2 2 0 012-2h10a2 2 0 012 2v16M9 3v18M15 3v18" />
          </svg>
        </div>
        <div className="brand-text">
          <span className="brand-title">Pergola Bioclimatica</span>
          <span className="brand-subtitle">Configuratore Architetturale 3D</span>
        </div>
      </div>

      <div className="top-info">
        <span className="info-chip">
          {cfg.width.toFixed(1)} × {cfg.depth.toFixed(1)} m
        </span>
        <span className="info-chip">
          {cfg.mounting === 'free' ? 'Autoportante' : cfg.mounting === 'wall1' ? 'A parete 1L' : 'A parete 2L'}
        </span>
      </div>

      <div className="top-actions">
        <button className="top-btn" onClick={handleShare} title="Copia link configurazione">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
          <span>{copied ? 'Copiato!' : 'Condividi'}</span>
        </button>

        <button className="top-btn" onClick={handleSnapshot} title="Cattura screenshot ad alta risoluzione">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
          <span>Foto</span>
        </button>

        <button
          className="top-btn primary-btn"
          onClick={handlePdfExport}
          disabled={exporting}
          title="Scarica scheda tecnica PDF completa con viste ortogonali"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="12" y1="18" x2="12" y2="12" />
            <line x1="9" y1="15" x2="15" y2="15" />
          </svg>
          <span>{exporting ? 'Generazione...' : 'Scheda PDF'}</span>
        </button>

        <button className="top-btn reset-btn" onClick={reset} title="Reimposta configurazione predefinita">
          Reset
        </button>
      </div>
    </header>
  )
}
