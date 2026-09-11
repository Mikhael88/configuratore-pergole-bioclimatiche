import { useConfigSelector, triggerCameraPreset, set } from '../lib/store'
import { CameraPreset } from '../lib/types'

export function CameraDock() {
  const showDims = useConfigSelector((s) => s.showDimensions)
  const lightingMode = useConfigSelector((s) => s.lightingMode)

  const presets: Array<{ id: CameraPreset; label: string; icon: string }> = [
    { id: 'isometric', label: 'Prospettiva', icon: '◰' },
    { id: 'front', label: 'Fronte', icon: '◻' },
    { id: 'side', label: 'Lato', icon: '▯' },
    { id: 'top', label: 'Dall’alto', icon: '⬒' },
    { id: 'interior', label: 'Interno', icon: '▲' }
  ]

  return (
    <div className="camera-dock">
      <div className="dock-group">
        {presets.map((p) => (
          <button
            key={p.id}
            className="dock-btn"
            onClick={() => triggerCameraPreset(p.id)}
            title={`Vista ${p.label}`}
          >
            <span className="dock-icon">{p.icon}</span>
            <span className="dock-label">{p.label}</span>
          </button>
        ))}
      </div>

      <div className="dock-separator" />

      <div className="dock-group">
        <button
          className={`dock-btn ${showDims ? 'active' : ''}`}
          onClick={() => set({ showDimensions: !showDims })}
          title="Mostra / Nascondi quote 3D"
        >
          <span className="dock-icon">📏</span>
          <span className="dock-label">Quote</span>
        </button>

        <button
          className={`dock-btn ${lightingMode === 'environment' ? 'active' : ''}`}
          onClick={() => set({ lightingMode: lightingMode === 'studio' ? 'environment' : 'studio' })}
          title="Alterna tra Luce Studio e Luce Cielo/Ambiente"
        >
          <span className="dock-icon">{lightingMode === 'studio' ? '💡' : '🌤️'}</span>
          <span className="dock-label">{lightingMode === 'studio' ? 'Studio' : 'Ambiente'}</span>
        </button>
      </div>
    </div>
  )
}
