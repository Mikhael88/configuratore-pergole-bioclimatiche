/**
 * CloudsLayer — procedural billboard cloud sprites for the intro flight.
 *
 * Deterministic, no drei: each cloud is a THREE <sprite> with a photo alpha
 * texture, distributed on 3 altitude bands. Slight drift for life.
 * Opacity multiplier (intro store cloudOpacity) drives the global fade-out.
 * Lives OUTSIDE Suspense: the texture loads via useEffect; until it's ready
 * nothing renders (a brief transparent moment at the very start, acceptable).
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useIntro, smoothstep } from './intro'

const CLOUD_TEXTURE = '/textures/clouds/cloud-1.png'

interface SpriteSpec {
  pos: [number, number, number]
  scale: [number, number, number]
  baseOp: number
  drift: number
  seed: number
}

function mulberry32(a: number) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function CloudsLayer() {
  const phase = useIntro((s) => s.phase)
  const opacity = useIntro((s) => s.cloudOpacity)
  const groupRef = useRef<THREE.Group>(null)
  const camera = useThree((s) => s.camera)
  const [texture, setTexture] = useState<THREE.Texture | null>(null)

  // Load the photo texture without Suspense
  useEffect(() => {
    const loader = new THREE.TextureLoader()
    let alive = true
    loader.load(CLOUD_TEXTURE, (tex) => {
      if (!alive) return
      tex.colorSpace = THREE.SRGBColorSpace
      setTexture(tex)
    })
    return () => {
      alive = false
    }
  }, [])

  const sprites = useMemo<SpriteSpec[]>(() => {
    const rng = mulberry32(12345)
    const specs: SpriteSpec[] = []
    // Single realistic cloud deck: main cumulus layer at ~12m, wisps at ~8m
    const bands: Array<{ alt: number; count: number; scatterR: number; sMin: number; sMax: number; op: number }> = [
      { alt: 12.0, count: 48, scatterR: 20, sMin: 8, sMax: 16, op: 0.92 },
      { alt: 8.0, count: 22, scatterR: 16, sMin: 5, sMax: 10, op: 0.55 }
    ]
    bands.forEach((band) => {
      for (let i = 0; i < band.count; i++) {
        const ang = rng() * Math.PI * 2
        const r = Math.sqrt(rng()) * band.scatterR
        const s = band.sMin + rng() * (band.sMax - band.sMin)
        specs.push({
          pos: [Math.cos(ang) * r, band.alt + (rng() - 0.5) * 2.0, Math.sin(ang) * r],
          scale: [s * (0.95 + rng() * 0.55), s * (0.55 + rng() * 0.35), 1],
          baseOp: band.op * (0.6 + rng() * 0.4),
          drift: (rng() - 0.5) * 0.35,
          seed: rng()
        })
      }
    })
    return specs
  }, [])

  // Drift animation + per-sprite distance fade + global altitude-linked fade.
  // As the camera descends below ~11.5m toward ~5m, the clouds smoothly dissolve.
  useFrame(() => {
    const g = groupRef.current
    if (!g) return
    const t = performance.now() / 1000
    const camPos = camera.position
    const camY = camPos.y
    // Altitude-linked global fade: full above 11.5m, smoothly dissolves down to 5.0m
    const altitudeFade = smoothstep(5.0, 11.5, camY)
    for (let i = 0; i < g.children.length; i++) {
      const c = g.children[i] as THREE.Sprite
      const spec = sprites[i]
      if (!spec) continue
      c.position.x = spec.pos[0] + Math.sin(t * 0.15 + spec.seed) * (0.5 + spec.drift)
      // Distance fade: dissolve clouds closer than 7m so they never pop against near plane
      const dist = camPos.distanceTo(c.position)
      const nearFade = smoothstep(2.0, 7.0, dist)
      const m = c.material as THREE.SpriteMaterial
      m.opacity = spec.baseOp * opacity * altitudeFade * nearFade
    }
  })

  if (phase === 'done' || !texture) return null

  return (
    <group ref={groupRef} renderOrder={10}>
      {sprites.map((s, i) => (
        <sprite key={i} position={s.pos} scale={s.scale}>
          <spriteMaterial
            map={texture}
            transparent
            opacity={s.baseOp}
            depthWrite={false}
            color="#e3e9f2"
          />
        </sprite>
      ))}
    </group>
  )
}
