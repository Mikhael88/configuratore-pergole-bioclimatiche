import { useState } from 'react'
import {
  ArrowDownToDot,
  CircleDot,
  CloudSun,
  Dot,
  Lightbulb,
  RedoDot,
  Ruler,
  Scan,
  type LucideIcon
} from 'lucide-react'
import { useConfigSelector, triggerCameraPreset, set } from '../lib/store'
import { CameraPreset } from '../lib/types'
import { Icon } from './Icon'

const PRESETS: Array<{ id: CameraPreset; label: string; icon: LucideIcon }> = [
  { id: 'isometric', label: 'Prospettiva', icon: RedoDot },
  { id: 'front', label: 'Frontale', icon: Dot },
  { id: 'side', label: 'Lato', icon: ArrowDownToDot },
  { id: 'top', label: 'Dall’alto', icon: Scan },
  { id: 'interior', label: 'Interno', icon: CircleDot }
]

export function CameraDock() {
  const [activePreset, setActivePreset] = useState<CameraPreset>('isometric')
  const showDims = useConfigSelector((s) => s.showDimensions)
  const lightingMode = useConfigSelector((s) => s.lightingMode)

  const selectPreset = (id: CameraPreset) => {
    setActivePreset(id)
    triggerCameraPreset(id)
  }

  return (
    <>
      {/* Quote + lighting — top, just left of the glass sidebar */}
      <div className="viewport-tools">
        <button
          className={`viewport-tool-btn ${showDims ? 'active' : ''}`}
          onClick={() => set({ showDimensions: !showDims })}
          title="Mostra / Nascondi quote 3D"
          aria-label="Quote"
        >
          <Icon icon={Ruler} size={16} />
        </button>
        <button
          className={`viewport-tool-btn ${lightingMode === 'environment' ? 'active' : ''}`}
          onClick={() =>
            set({ lightingMode: lightingMode === 'studio' ? 'environment' : 'studio' })
          }
          title="Alterna tra Luce Studio e Luce Cielo/Ambiente"
          aria-label={lightingMode === 'studio' ? 'Studio' : 'Ambiente'}
        >
          <Icon icon={lightingMode === 'studio' ? Lightbulb : CloudSun} size={16} />
        </button>
      </div>

      {/* View presets only */}
      <div className="camera-dock">
        <div className="dock-group">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              className={`dock-btn ${activePreset === p.id ? 'active' : ''}`}
              onClick={() => selectPreset(p.id)}
              title={`Vista ${p.label}`}
            >
              <span className="dock-icon">
                <Icon icon={p.icon} size={14} />
              </span>
              <span className="dock-label">{p.label}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
