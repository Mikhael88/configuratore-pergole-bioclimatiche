import { useRef, useEffect, Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import * as THREE from 'three'
import { SceneEnv } from './scene/SceneEnv'
import { Pergola } from './scene/Pergola'
import { DimensionsOverlay } from './scene/DimensionsOverlay'
import { CameraController } from './scene/CameraController'
import { Panel } from './ui/Panel'
import { CameraDock } from './ui/CameraDock'
import { BrandLogo } from './ui/BrandLogo'
import { CapturedViews } from './lib/pdfExport'
import { getConfig } from './lib/store'
import { getBrandByHost } from './config/getBrandByHost'

export default function App() {
  const brand = getBrandByHost()
  const controlsRef = useRef<OrbitControlsImpl | null>(null)
  const threeRef = useRef<{
    gl: THREE.WebGLRenderer
    scene: THREE.Scene
    camera: THREE.PerspectiveCamera
  } | null>(null)

  // Dynamically configure page title, description meta, and brand favicon
  useEffect(() => {
    document.title = brand.title

    let metaDesc = document.querySelector('meta[name="description"]')
    if (!metaDesc) {
      metaDesc = document.createElement('meta')
      metaDesc.setAttribute('name', 'description')
      document.head.appendChild(metaDesc)
    }
    metaDesc.setAttribute('content', brand.description)

    let iconLink = document.querySelector<HTMLLinkElement>('link[rel~="icon"]')
    if (!iconLink) {
      iconLink = document.createElement('link')
      iconLink.rel = 'icon'
      document.head.appendChild(iconLink)
    }
    iconLink.href = brand.favicon
  }, [brand])

  // Capture clean multi-angle snapshots for PDF export
  const captureViews = async (): Promise<CapturedViews> => {
    if (!threeRef.current) throw new Error('3D Canvas not initialized')
    const { gl, scene, camera } = threeRef.current
    const origPos = camera.position.clone()
    const origTarget = controlsRef.current ? controlsRef.current.target.clone() : new THREE.Vector3(0, 1, 0)
    const origFov = camera.fov
    const viewBackup = camera.view ? { ...camera.view } : null

    // Neutral framing for export (no sidebar compensation)
    camera.clearViewOffset()

    const H = getConfig().height

    // Helper to render and snapshot a view
    const snap = (pos: [number, number, number], lookAt: [number, number, number]): string => {
      camera.fov = 18 // tight telephoto for orthogonal architectural look
      camera.position.set(...pos)
      camera.lookAt(...lookAt)
      camera.updateProjectionMatrix()
      gl.render(scene, camera)
      return gl.domElement.toDataURL('image/png')
    }

    // Capture views
    const front = snap([0, H / 2, 18], [0, H / 2, 0])
    const side = snap([-18, H / 2, 0], [0, H / 2, 0])
    const top = snap([0, 18, 0.001], [0, 0, 0])

    // Restore original camera
    camera.fov = origFov
    camera.position.copy(origPos)
    camera.lookAt(origTarget)
    if (viewBackup?.enabled) {
      camera.setViewOffset(
        viewBackup.fullWidth,
        viewBackup.fullHeight,
        viewBackup.offsetX,
        viewBackup.offsetY,
        viewBackup.width,
        viewBackup.height
      )
    } else {
      camera.clearViewOffset()
    }
    camera.updateProjectionMatrix()
    gl.render(scene, camera)

    return { front, side, top }
  }

  return (
    <div className="app-container">
      {/* Dynamic Brand Logo badge in top-left */}
      <BrandLogo brand={brand} />

      {/* 3D Viewport Workspace */}
      <div className="canvas-wrapper">
        <Canvas
          shadows={{ type: THREE.PCFSoftShadowMap }}
          dpr={[1, 2]}
          gl={{
            preserveDrawingBuffer: true,
            antialias: true,
            toneMapping: THREE.AgXToneMapping,
            toneMappingExposure: 1.15
          }}
          camera={{ position: [7, 4.8, 7], fov: 40, near: 0.1, far: 200 }}
          onCreated={({ gl, scene, camera }) => {
            threeRef.current = { gl, scene, camera: camera as THREE.PerspectiveCamera }
          }}
        >
          <Suspense fallback={null}>
            <SceneEnv />
            <Pergola />
            <DimensionsOverlay />
            <CameraController controlsRef={controlsRef} />
          </Suspense>
          <OrbitControls
            ref={controlsRef}
            target={[0, 1, 0]}
            makeDefault
            enableDamping
            dampingFactor={0.06}
            minDistance={2}
            maxDistance={22}
            maxPolarAngle={Math.PI * 0.492}
          />
        </Canvas>

        {/* Viewpoint presets dock */}
        <CameraDock />

        <div className="brand-logo-box" aria-label="FrontYard Group">
          <img
            src="/brand/frontyard-group.png"
            alt="FrontYard Group"
            className="brand-logo-img"
          />
        </div>
      </div>

      {/* Minimalist Glassmorphic Configuration Panel */}
      <Panel onCaptureViews={captureViews} />
    </div>
  )
}