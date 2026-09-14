import { useConfigSelector } from '../lib/store'
import { Html, Line } from '@react-three/drei'

const LINE_COLOR = '#64748b'

export function DimensionsOverlay() {
  const width = useConfigSelector((s) => s.width)
  const depth = useConfigSelector((s) => s.depth)
  const height = useConfigSelector((s) => s.height)
  const show = useConfigSelector((s) => s.showDimensions)

  if (!show) return null

  const w = width
  const d = depth
  const h = height

  // Offsets from the structure
  const offsetFront = d / 2 + 0.35
  const offsetSide = w / 2 + 0.35

  return (
    <group>
      {/* --- Width Dimension Line (Front) --- */}
      <group position={[0, 0.02, offsetFront]}>
        <Line
          points={[
            [-w / 2, 0, 0],
            [w / 2, 0, 0]
          ]}
          color={LINE_COLOR}
          lineWidth={1}
        />
        <Line
          points={[
            [-w / 2, 0, -0.08],
            [-w / 2, 0, 0.08]
          ]}
          color={LINE_COLOR}
          lineWidth={1}
        />
        <Line
          points={[
            [w / 2, 0, -0.08],
            [w / 2, 0, 0.08]
          ]}
          color={LINE_COLOR}
          lineWidth={1}
        />
        <Html position={[0, 0, 0]} center className="dim-badge-container">
          <div className="dim-badge" title="Larghezza (L)">
            <span className="dim-value">{w.toFixed(2)}</span>
            <span className="dim-unit">m</span>
          </div>
        </Html>
      </group>

      {/* --- Depth Dimension Line (Right Side) --- */}
      <group position={[offsetSide, 0.02, 0]}>
        <Line
          points={[
            [0, 0, -d / 2],
            [0, 0, d / 2]
          ]}
          color={LINE_COLOR}
          lineWidth={1}
        />
        <Line
          points={[
            [-0.08, 0, -d / 2],
            [0.08, 0, -d / 2]
          ]}
          color={LINE_COLOR}
          lineWidth={1}
        />
        <Line
          points={[
            [-0.08, 0, d / 2],
            [0.08, 0, d / 2]
          ]}
          color={LINE_COLOR}
          lineWidth={1}
        />
        <Html position={[0, 0, 0]} center className="dim-badge-container">
          <div className="dim-badge" title="Profondità (P)">
            <span className="dim-value">{d.toFixed(2)}</span>
            <span className="dim-unit">m</span>
          </div>
        </Html>
      </group>

      {/* --- Height Dimension Line (Left Front Corner) --- */}
      <group position={[-w / 2 - 0.35, 0, d / 2]}>
        <Line
          points={[
            [0, 0, 0],
            [0, h, 0]
          ]}
          color={LINE_COLOR}
          lineWidth={1}
        />
        <Line
          points={[
            [-0.08, 0, 0],
            [0.08, 0, 0]
          ]}
          color={LINE_COLOR}
          lineWidth={1}
        />
        <Line
          points={[
            [-0.08, h, 0],
            [0.08, h, 0]
          ]}
          color={LINE_COLOR}
          lineWidth={1}
        />
        <Html position={[0, h / 2, 0]} center className="dim-badge-container">
          <div className="dim-badge" title="Altezza (A)">
            <span className="dim-value">{h.toFixed(2)}</span>
            <span className="dim-unit">m</span>
          </div>
        </Html>
      </group>
    </group>
  )
}
