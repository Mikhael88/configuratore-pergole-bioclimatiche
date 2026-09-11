import { useConfigSelector } from '../lib/store'
import { Html, Line } from '@react-three/drei'

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
          color="#334155"
          lineWidth={1.5}
        />
        {/* End ticks */}
        <Line
          points={[
            [-w / 2, 0, -0.1],
            [-w / 2, 0, 0.1]
          ]}
          color="#334155"
          lineWidth={1.5}
        />
        <Line
          points={[
            [w / 2, 0, -0.1],
            [w / 2, 0, 0.1]
          ]}
          color="#334155"
          lineWidth={1.5}
        />
        <Html position={[0, 0, 0]} center distanceFactor={14} className="dim-badge-container">
          <div className="dim-badge">
            <span className="dim-label">Larghezza (L)</span>
            <span className="dim-value">{w.toFixed(2)} m</span>
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
          color="#334155"
          lineWidth={1.5}
        />
        {/* End ticks */}
        <Line
          points={[
            [-0.1, 0, -d / 2],
            [0.1, 0, -d / 2]
          ]}
          color="#334155"
          lineWidth={1.5}
        />
        <Line
          points={[
            [-0.1, 0, d / 2],
            [0.1, 0, d / 2]
          ]}
          color="#334155"
          lineWidth={1.5}
        />
        <Html position={[0, 0, 0]} center distanceFactor={14} className="dim-badge-container">
          <div className="dim-badge">
            <span className="dim-label">Profondità (P)</span>
            <span className="dim-value">{d.toFixed(2)} m</span>
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
          color="#334155"
          lineWidth={1.5}
        />
        {/* End ticks */}
        <Line
          points={[
            [-0.1, 0, 0],
            [0.1, 0, 0]
          ]}
          color="#334155"
          lineWidth={1.5}
        />
        <Line
          points={[
            [-0.1, h, 0],
            [0.1, h, 0]
          ]}
          color="#334155"
          lineWidth={1.5}
        />
        <Html position={[0, h / 2, 0]} center distanceFactor={14} className="dim-badge-container">
          <div className="dim-badge">
            <span className="dim-label">Altezza (A)</span>
            <span className="dim-value">{h.toFixed(2)} m</span>
          </div>
        </Html>
      </group>
    </group>
  )
}
