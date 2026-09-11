import { useEffect, useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import * as THREE from 'three'
import { onCameraPreset } from '../lib/store'
import { CameraPreset } from '../lib/types'

export function CameraController({ controlsRef }: { controlsRef: React.RefObject<OrbitControlsImpl | null> }) {
  const { camera } = useThree()

  const targetPos = useRef<THREE.Vector3>(camera.position.clone())
  const targetLookAt = useRef<THREE.Vector3>(new THREE.Vector3(0, 1, 0))
  const isTransitioning = useRef<boolean>(false)

  useEffect(() => {
    return onCameraPreset((preset: CameraPreset) => {
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
        case 'top':
          targetPos.current.set(0, 9, 0.01)
          targetLookAt.current.set(0, 0, 0)
          break
        case 'interior':
          targetPos.current.set(0, 0.7, 0)
          targetLookAt.current.set(0, 2.4, 0.5)
          break
      }
      isTransitioning.current = true
    })
  }, [])

  useFrame((_, delta) => {
    if (!isTransitioning.current) return

    const t = Math.min(1, delta * 4.5)
    camera.position.lerp(targetPos.current, t)

    if (controlsRef.current) {
      controlsRef.current.target.lerp(targetLookAt.current, t)
      controlsRef.current.update()
    }

    if (camera.position.distanceTo(targetPos.current) < 0.05) {
      camera.position.copy(targetPos.current)
      if (controlsRef.current) {
        controlsRef.current.target.copy(targetLookAt.current)
      }
      isTransitioning.current = false
    }
  })

  return null
}
