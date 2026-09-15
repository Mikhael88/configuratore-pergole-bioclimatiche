/**
 * IntroSky — animates scene background + fog during the intro flight.
 *
 * At progress 0 the world is a bright sky (light blue, far fog) so the cloud
 * sprites read with full contrast; at progress 1 it has blended into the
 * exact studio ground color / fog that SceneEnv normally attaches, so the
 * handoff at the end of the flight is seamless.
 *
 * Lives OUTSIDE Suspense and mutates scene.background / scene.fog directly
 * each frame. On completion it writes the studio values back, so SceneEnv
 * (which only re-attaches on re-render) doesn't need to be touched.
 */
import { useRef, useLayoutEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { getIntro, smoothstep } from './intro'
import { getConfig } from '../lib/store'

/** Vibrant sky blue for the clear upper atmosphere under AgX tone mapping */
const SKY_COLOR = new THREE.Color('#3d7ec2')
const SKY_FOG_NEAR = 32
const SKY_FOG_FAR = 85

const STUDIO_GROUND_NIGHT = new THREE.Color('#1e242d')
const STUDIO_GROUND_DAY = new THREE.Color('#dcdfe3')
const STUDIO_GROUND_OUTDOOR = new THREE.Color('#d0d4d9')

function getStudioGround(): THREE.Color {
  const cfg = getConfig()
  if (cfg.sun.elevation <= 15) return STUDIO_GROUND_NIGHT
  if (cfg.lightingMode === 'studio') return STUDIO_GROUND_DAY
  return STUDIO_GROUND_OUTDOOR
}

const tmpColor = new THREE.Color()

export function IntroSky() {
  const scene = useThree((s) => s.scene)
  const isDoneRef = useRef(false)

  // Immediate initialization before first paint to prevent any black/uninitialized frame
  useLayoutEffect(() => {
    const intro = getIntro()
    if (intro.phase !== 'done') {
      scene.background = SKY_COLOR.clone()
      scene.fog = new THREE.Fog(SKY_COLOR.clone(), SKY_FOG_NEAR, SKY_FOG_FAR)
    }
  }, [scene])

  useFrame(() => {
    const intro = getIntro()
    if (intro.phase === 'idle') {
      scene.background = SKY_COLOR
      return
    }

    // When the intro completes or skips, snap once to exact studio values and stop
    if (intro.phase === 'done') {
      if (!isDoneRef.current) {
        isDoneRef.current = true
        const ground = getStudioGround()
        scene.background = ground
        if (scene.fog && (scene.fog as THREE.Fog).isFog) {
          const f = scene.fog as THREE.Fog
          f.color.copy(ground)
          f.near = 12
          f.far = 36
        }
      }
      return
    }

    const ground = getStudioGround()
    const p = THREE.MathUtils.clamp(intro.progress, 0, 1)

    // Smooth background color blend: clear sky -> studio ground
    tmpColor.copy(SKY_COLOR).lerp(ground, smoothstep(0.2, 0.95, p))
    scene.background = tmpColor

    // Fog: smooth monotonic transition from sky atmosphere to studio depth fog
    const s = smoothstep(0, 1, p)
    const targetNear = THREE.MathUtils.lerp(SKY_FOG_NEAR, 12, s)
    const targetFar = THREE.MathUtils.lerp(SKY_FOG_FAR, 36, s)

    const fog = scene.fog as THREE.Fog | null
    if (fog && fog.isFog) {
      fog.color.copy(tmpColor)
      fog.near = targetNear
      fog.far = targetFar
    } else if (!fog) {
      scene.fog = new THREE.Fog(tmpColor.clone(), targetNear, targetFar)
    }
  })

  return null
}
