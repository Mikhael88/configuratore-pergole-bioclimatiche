/**
 * IntroFlight — flies the camera from above the clouds down to the default
 * isometric product view in INTRO_DURATION seconds.
 *
 * Path: starts high at a gentle 3/4 sky angle inside the upper cloud band,
 * dives through the deck, then swings into the default isometric position.
 * Uses a Catmull-Rom curve so motion is continuous (no waypoint lurching),
 * with diveEase() for a fast-in / soft-land feel. FOV breathes 55 → 40.
 *
 * Hands control back by setting phase 'done' (store marks seen + reveals UI).
 */
import { useEffect, useMemo, useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import * as THREE from 'three'
import { INTRO_DURATION, diveEase, useIntro } from './intro'

interface IntroFlightProps {
  controlsRef: React.RefObject<OrbitControlsImpl | null>
}

const END_CAMERA_POS = new THREE.Vector3(7, 4.8, 7)
const LOOK_TARGET = new THREE.Vector3(0, 1, 0)
const CAMERA_FOV = 40

export function IntroFlight({ controlsRef }: IntroFlightProps) {
  const { camera } = useThree()
  const phase = useIntro((s) => s.phase)
  const start = useIntro((s) => s.start)
  const setProgress = useIntro((s) => s.setProgress)
  const elapsed = useRef(0)

  // Direct flight path: start high in the soft cloud layer, glide through the clouds,
  // and settle into the default isometric view.
  const path = useMemo(() => {
    return new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(9.5, 17.5, 15.5), // High above in soft clouds
        new THREE.Vector3(9.0, 12.0, 12.5), // Gliding smoothly through clouds
        new THREE.Vector3(8.0, 7.0, 9.2),   // Emerging below clouds, pergola revealed
        new THREE.Vector3(7.0, 4.8, 7.0)    // Exact default isometric camera position
      ],
      false,
      'centripetal'
    )
  }, [])

  // Kick off intro flight
  useEffect(() => {
    start()
  }, [start])

  // Safety synchronization whenever intro phase becomes 'done' (including user skip)
  useEffect(() => {
    if (phase === 'done') {
      camera.position.copy(END_CAMERA_POS)
      const perspective = camera as THREE.PerspectiveCamera
      if (perspective.isPerspectiveCamera) {
        perspective.fov = CAMERA_FOV
        perspective.updateProjectionMatrix()
      }
      camera.lookAt(LOOK_TARGET)
      if (controlsRef.current) {
        controlsRef.current.target.copy(LOOK_TARGET)
        controlsRef.current.update()
      }
    }
  }, [phase, camera, controlsRef])

  useFrame((_, delta) => {
    if (phase !== 'flying') return

    const dt = Math.min(delta, 0.1)
    elapsed.current += dt
    const t = Math.min(1, elapsed.current / INTRO_DURATION)
    setProgress(t)

    const e = diveEase(t)
    const pos = path.getPointAt(e)

    camera.position.copy(pos)
    camera.lookAt(LOOK_TARGET)

    const perspective = camera as THREE.PerspectiveCamera
    if (perspective.isPerspectiveCamera && perspective.fov !== CAMERA_FOV) {
      perspective.fov = CAMERA_FOV
      perspective.updateProjectionMatrix()
    }

    if (controlsRef.current) {
      controlsRef.current.target.copy(LOOK_TARGET)
    }

    if (t >= 1) {
      camera.position.copy(END_CAMERA_POS)
      camera.lookAt(LOOK_TARGET)
      if (controlsRef.current) {
        controlsRef.current.target.copy(LOOK_TARGET)
        controlsRef.current.update()
      }
      setProgress(1)
    }
  })

  return null
}
