/**
 * SceneEnv — Architectural lighting & environment for the 3D configurator.
 *
 * Supports:
 * - Studio Light vs Environment Light modes
 * - Dynamic Sun tracking with real-time shadow projection reacting to louvers and screens
 * - Sun elevation-driven lighting intensity and golden hour / dusk transitions
 * - Crisp directional shadows on the ground with contact shadows
 */
import { useConfigSelector } from '../lib/store'
import { ContactShadows, Environment, Lightformer } from '@react-three/drei'
import * as THREE from 'three'
import { useMemo } from 'react'

const SUN_RADIUS = 28

function sunVector(azimuthDeg: number, elevationDeg: number): THREE.Vector3 {
  const az = THREE.MathUtils.degToRad(azimuthDeg)
  const el = THREE.MathUtils.degToRad(Math.max(1, elevationDeg))
  const y = Math.sin(el)
  const h = Math.cos(el)
  return new THREE.Vector3(Math.cos(az) * h, y, Math.sin(az) * h)
}

export function SceneEnv() {
  const sun = useConfigSelector((s) => s.sun)
  const lightingMode = useConfigSelector((s) => s.lightingMode)
  const led = useConfigSelector((s) => s.led)

  const dir = useMemo(() => sunVector(sun.azimuth, sun.elevation), [sun.azimuth, sun.elevation])
  const sunPos = useMemo(() => dir.clone().multiplyScalar(SUN_RADIUS), [dir])

  // Lighting calculations based on sun elevation
  const { sunIntensity, sunColor, ambientIntensity, ambientColor, skyIntensity } = useMemo(() => {
    const el = sun.elevation
    if (el > 40) {
      // Full daylight / noon
      return {
        sunIntensity: 2.2,
        sunColor: '#fff9ed',
        ambientIntensity: 0.55,
        ambientColor: '#e3ecff',
        skyIntensity: 1.0
      }
    } else if (el > 15) {
      // Afternoon / Golden Hour
      const t = (el - 15) / 25
      return {
        sunIntensity: 1.2 + t * 1.0,
        sunColor: new THREE.Color().lerpColors(new THREE.Color('#ff8f4d'), new THREE.Color('#fff4e0'), t).getStyle(),
        ambientIntensity: 0.35 + t * 0.2,
        ambientColor: new THREE.Color().lerpColors(new THREE.Color('#a190b0'), new THREE.Color('#dfe7ff'), t).getStyle(),
        skyIntensity: 0.4 + t * 0.6
      }
    } else {
      // Twilight / Night
      const t = Math.max(0, el / 15)
      return {
        sunIntensity: 0.15 * t,
        sunColor: '#30426b',
        ambientIntensity: 0.15 + t * 0.15,
        ambientColor: '#1a2238',
        skyIntensity: 0.15 + t * 0.25
      }
    }
  }, [sun.elevation])

  const groundColor = useMemo(() => {
    if (sun.elevation <= 15) return '#1e242d'
    if (lightingMode === 'studio') return '#dcdfe3'
    return '#d0d4d9'
  }, [sun.elevation, lightingMode])

  return (
    <>
      {/* --- Infinite Studio Limbo (Background Color & Seamless Depth Fog) --- */}
      <color attach="background" args={[groundColor]} />
      <fog attach="fog" args={[groundColor, 12, 36]} />

      {/* --- Environment Dome & Lighting --- */}
      {lightingMode === 'studio' ? (
        <Environment resolution={256} environmentIntensity={skyIntensity * 0.65}>
          <Lightformer
            form="rect"
            scale={15}
            intensity={skyIntensity * 0.7}
            color="#bfd6ff"
            position={[0, 25, -25]}
            rotation={[1.1, 0, Math.PI]}
          />
          <Lightformer
            form="rect"
            scale={20}
            intensity={skyIntensity * 0.45}
            color="#ffffff"
            position={[-25, 15, 0]}
            rotation={[0, -Math.PI / 2, 0]}
          />
          <Lightformer
            form="rect"
            scale={20}
            intensity={skyIntensity * 0.45}
            color="#ffffff"
            position={[25, 15, 0]}
            rotation={[0, Math.PI / 2, 0]}
          />
        </Environment>
      ) : (
        /* Outdoor Sky Environment */
        <Environment resolution={512} environmentIntensity={skyIntensity * 1.1}>
          <Lightformer
            form="circle"
            scale={18}
            intensity={skyIntensity * 1.2}
            color={sunColor}
            position={[sunPos.x * 0.5, sunPos.y * 0.5, sunPos.z * 0.5]}
          />
          <Lightformer
            form="rect"
            scale={40}
            intensity={skyIntensity * 0.6}
            color="#88b5ea"
            position={[0, 30, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
          />
          <Lightformer
            form="rect"
            scale={40}
            intensity={skyIntensity * 0.3}
            color="#7a9668"
            position={[0, -10, 0]}
            rotation={[Math.PI / 2, 0, 0]}
          />
        </Environment>
      )}

      {/* --- Ambient Lighting --- */}
      <ambientLight intensity={ambientIntensity} color={ambientColor} />

      {/* --- Directional Sun with Live Shadows --- */}
      <directionalLight
        position={[sunPos.x, sunPos.y, sunPos.z]}
        intensity={sunIntensity}
        color={sunColor}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={1}
        shadow-camera-far={65}
        shadow-camera-left={-7}
        shadow-camera-right={7}
        shadow-camera-top={7}
        shadow-camera-bottom={-7}
        shadow-bias={-0.0003}
        shadow-normalBias={0.02}
      />

      {/* Subtle night fill when LED is active */}
      {led && (
        <pointLight position={[0, 2.3, 0]} intensity={1.8} distance={7} decay={2} color="#ffdfa0" />
      )}

      {/* --- Contact Shadows for Column Feet & Structure Grounding --- */}
      <ContactShadows
        position={[0, 0.0005, 0]}
        opacity={sun.elevation > 15 ? 0.65 : 0.3}
        scale={16}
        blur={1.8}
        far={3}
        resolution={512}
      />

      {/* --- Ground Plane Seamlessly Fading into Horizon Fog --- */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.0001, 0]} receiveShadow>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial color={groundColor} roughness={0.82} metalness={0.02} />
      </mesh>
    </>
  )
}