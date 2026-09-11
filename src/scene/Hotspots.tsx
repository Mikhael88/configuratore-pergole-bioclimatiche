import { Html } from '@react-three/drei'
import { useConfigSelector, setStep, set } from '../lib/store'

export function Hotspots() {
  const width = useConfigSelector((s) => s.width)
  const depth = useConfigSelector((s) => s.depth)
  const height = useConfigSelector((s) => s.height)

  return (
    <group>
      {/* Roof Hotspot */}
      <group position={[0, height + 0.15, 0]}>
        <Html center distanceFactor={15}>
          <button
            className="hotspot-pin"
            title="Configura Tetto e Lamelle"
            onClick={() => setStep(1)}
          >
            <span className="hotspot-dot" />
            <span className="hotspot-text">Tetto & Lamelle</span>
          </button>
        </Html>
      </group>

      {/* Front Side Hotspot */}
      <group position={[0, height / 2, depth / 2 + 0.1]}>
        <Html center distanceFactor={15}>
          <button
            className="hotspot-pin"
            title="Configura Chiusure Laterali"
            onClick={() => setStep(2)}
          >
            <span className="hotspot-dot" />
            <span className="hotspot-text">Chiusure Fronte</span>
          </button>
        </Html>
      </group>

      {/* Column Finishes Hotspot */}
      <group position={[width / 2 + 0.1, height * 0.7, depth / 2]}>
        <Html center distanceFactor={15}>
          <button
            className="hotspot-pin"
            title="Configura Finiture e Colori"
            onClick={() => setStep(3)}
          >
            <span className="hotspot-dot" />
            <span className="hotspot-text">Finiture Struttura</span>
          </button>
        </Html>
      </group>

      {/* LED Lighting Hotspot */}
      <group position={[-width / 2 + 0.1, height - 0.15, 0]}>
        <Html center distanceFactor={15}>
          <button
            className="hotspot-pin"
            title="Illuminazione e Ambiente"
            onClick={() => {
              setStep(4)
              set({ led: true })
            }}
          >
            <span className="hotspot-dot" />
            <span className="hotspot-text">Luce LED</span>
          </button>
        </Html>
      </group>
    </group>
  )
}
