import { useEffect, useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import * as THREE from 'three'
import { onCameraPreset, getConfig } from '../lib/store'
import { CameraPreset } from '../lib/types'
import { getIntro } from '../intro/intro'

const DEFAULT_FOV = 40
const INTERIOR_FOV = 80

/** Pixels of the canvas covered by the right glass sidebar (incl. gap). */
function measureRightSidebarPx(canvasEl: HTMLElement): number {
  const panel = document.querySelector('.glass-panel')
  if (!panel) return 0

  const canvasRect = canvasEl.getBoundingClientRect()
  const panelRect = panel.getBoundingClientRect()
  const overlap = canvasRect.right - panelRect.left
  return Math.max(0, Math.min(overlap, canvasRect.width * 0.85))
}

function applySidebarViewOffset(
  camera: THREE.PerspectiveCamera,
  width: number,
  height: number,
  sidebarPx: number
) {
  if (sidebarPx <= 1 || width <= sidebarPx + 40) {
    if (camera.view?.enabled) {
      camera.clearViewOffset()
      camera.aspect = width / Math.max(height, 1)
      camera.updateProjectionMatrix()
    }
    return
  }

  // Shift optical center into the free area left of the sidebar.
  // Re-apply every time so FOV lerps / R3F aspect resets cannot undo it.
  camera.setViewOffset(width + sidebarPx, height, sidebarPx, 0, width, height)
  camera.updateProjectionMatrix()
}

export function CameraController({ controlsRef }: { controlsRef: React.RefObject<OrbitControlsImpl | null> }) {
  const { camera, size, gl } = useThree()

  const targetPos = useRef<THREE.Vector3>(camera.position.clone())
  const targetLookAt = useRef<THREE.Vector3>(new THREE.Vector3(0, 1, 0))
  const targetFov = useRef(DEFAULT_FOV)
  const isTransitioning = useRef(false)
  const sidebarPxRef = useRef(0)

  // Measure sidebar overlap; framing is re-asserted every frame below
  useEffect(() => {
    const syncMeasure = () => {
      sidebarPxRef.current = measureRightSidebarPx(gl.domElement)
      document.documentElement.style.setProperty(
        '--sidebar-overlay',
        `${sidebarPxRef.current}px`
      )
    }

    syncMeasure()

    const panel = document.querySelector('.glass-panel')
    const ro = new ResizeObserver(syncMeasure)
    ro.observe(gl.domElement)
    if (panel) ro.observe(panel)
    window.addEventListener('resize', syncMeasure)

    return () => {
      ro.disconnect()
      window.removeEventListener('resize', syncMeasure)
      const perspective = camera as THREE.PerspectiveCamera
      if (perspective.isPerspectiveCamera) {
        perspective.clearViewOffset()
        perspective.updateProjectionMatrix()
      }
      document.documentElement.style.removeProperty('--sidebar-overlay')
    }
  }, [camera, gl, size.width, size.height])

  useEffect(() => {
    return onCameraPreset((preset: CameraPreset) => {
      // Ignore preset requests while the intro flight owns the camera
      const intro = getIntro()
      if (intro.phase !== 'done' && intro.phase !== 'idle') return

      targetFov.current = preset === 'interior' ? INTERIOR_FOV : DEFAULT_FOV

      switch (preset) {
        case 'isometric':
          targetPos.current.set(7, 5, 7)
          targetLookAt.current.set(0, 1, 0)
          break
        case 'front':
          targetPos.current.set(0, 1.8, 8)
          targetLookAt.current.set(0, 1, 0)
          break
        case 'side':
          targetPos.current.set(-8, 1.8, 0)
          targetLookAt.current.set(0, 1, 0)
          break
        case 'top': {
          // Lift to top-down but keep current yaw — no forced spin
          const currentTarget =
            controlsRef.current?.target.clone() ?? new THREE.Vector3(0, 0, 0)
          const lookAt = new THREE.Vector3(currentTarget.x, 0, currentTarget.z)
          const offset = camera.position.clone().sub(
            controlsRef.current?.target ?? lookAt
          )
          const spherical = new THREE.Spherical().setFromVector3(offset)
          spherical.phi = 0.06 // almost nadir; keeps theta meaningful
          spherical.radius = Math.max(spherical.radius, 12)
          // spherical.theta unchanged → preserves orbit rotation
          targetPos.current.setFromSpherical(spherical).add(lookAt)
          targetLookAt.current.copy(lookAt)
          break
        }
        case 'interior': {
          // Eye-level at a front-left interior corner, looking across the bay
          const { width, depth, height } = getConfig()
          const inset = 0.5
          targetPos.current.set(-width / 2 + inset, 1.0, depth / 2 - inset)
          targetLookAt.current.set(
            width / 2 - inset,
            Math.min(1.25, height * 0.5),
            -depth / 2 + inset
          )
          break
        }
      }
      isTransitioning.current = true
    })
  }, [camera, controlsRef])

  useFrame((_, delta) => {
    const perspective = camera as THREE.PerspectiveCamera

    // While the intro flight owns the camera, skip preset lerping but keep
    // the sidebar view-offset applied (IntroFlight sets fov/pos directly).
    const introActive = getIntro().phase === 'flying'

    if (!introActive && isTransitioning.current) {
      const t = Math.min(1, delta * 4.5)
      camera.position.lerp(targetPos.current, t)

      if (perspective.isPerspectiveCamera) {
        perspective.fov = THREE.MathUtils.lerp(perspective.fov, targetFov.current, t)
      }

      if (controlsRef.current) {
        controlsRef.current.target.lerp(targetLookAt.current, t)
        controlsRef.current.update()
      }

      const posDone = camera.position.distanceTo(targetPos.current) < 0.05
      const fovDone =
        !perspective.isPerspectiveCamera ||
        Math.abs(perspective.fov - targetFov.current) < 0.15

      if (posDone && fovDone) {
        camera.position.copy(targetPos.current)
        if (perspective.isPerspectiveCamera) {
          perspective.fov = targetFov.current
        }
        if (controlsRef.current) {
          controlsRef.current.target.copy(targetLookAt.current)
        }
        isTransitioning.current = false
      }
    }

    // Re-assert after FOV/preset updates so framing stays in the free viewport
    if (perspective.isPerspectiveCamera) {
      applySidebarViewOffset(
        perspective,
        size.width,
        size.height,
        sidebarPxRef.current
      )
    }
  })

  return null
}
