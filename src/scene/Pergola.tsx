import { useMemo, useRef } from 'react'
import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { LIB_URL, NODE_NAMES } from './loader'
import { localBox, clamp } from './parts'
import { useConfigSelector } from '../lib/store'
import { SIDE_KEYS, SideKey } from '../lib/types'
import { WallMounting } from './WallMounting'

useGLTF.setDecoderPath('/draco/')

type Anchor = 'baseCenter' | 'center' | 'topCenter' | 'bottomCenter'

interface PartProps {
  node: THREE.Object3D
  anchor: Anchor
  position?: [number, number, number]
  rotation?: [number, number, number]
  scale?: [number, number, number]
  material?: THREE.Material
  castShadow?: boolean
  receiveShadow?: boolean
  children?: React.ReactNode
}

/**
 * Re-anchor + clone a GLB part so its anchor sits at the group origin.
 * Assigns dynamic architectural PBR materials and shadow projection.
 */
function Part({
  node,
  anchor,
  position,
  rotation,
  scale,
  material,
  castShadow = true,
  receiveShadow = true,
  children
}: PartProps) {
  const a = useMemo(() => {
    const b = localBox(node)
    const p = (node as THREE.Mesh).position || new THREE.Vector3()
    let y = (b.min.y + b.max.y) / 2
    if (anchor === 'topCenter') y = b.max.y
    else if (anchor === 'baseCenter' || anchor === 'bottomCenter') y = b.min.y

    return new THREE.Vector3(
      (b.min.x + b.max.x) / 2 + p.x,
      y + p.y,
      (b.min.z + b.max.z) / 2 + p.z
    )
  }, [node, anchor])

  const off = useMemo<[number, number, number]>(
    () => [-a.x * (scale?.[0] ?? 1), -a.y * (scale?.[1] ?? 1), -a.z * (scale?.[2] ?? 1)],
    [a, scale]
  )

  const cloned = useMemo(() => {
    const c = node.clone(true)
    c.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh
        mesh.castShadow = castShadow
        mesh.receiveShadow = receiveShadow
        if (material) {
          mesh.material = material
        }
      }
    })
    return c
  }, [node, material, castShadow, receiveShadow])

  return (
    <group position={position} rotation={rotation}>
      <group position={off}>
        <group scale={scale}>
          <primitive object={cloned} />
        </group>
      </group>
      {children}
    </group>
  )
}

/**
 * Columns:
 * - 'free': 4 vertical structural columns
 * - 'wall1': 2 front columns (rear anchored into wall)
 * - 'wall2': 0 columns (entirely wall-anchored in corner/niche)
 *
 * Symmetrical Mirroring (Blender Mirror XY equivalent):
 * - Base column modeled at Front-Left (-X, +Z): scale [1, 1, 1]
 * - Front-Right (+X, +Z): Mirrored on X -> scale [-1, 1, 1]
 * - Back-Left (-X, -Z): Mirrored on Z -> scale [1, 1, -1]
 * - Back-Right (+X, -Z): Mirrored on X and Z -> scale [-1, 1, -1]
 *
 * Dedicated External Column LED:
 * - When ledColumn is active, renders nodes.col_led along each active column corner groove.
 */
function Columns({
  nodes,
  mat,
  ledMat
}: {
  nodes: Record<string, THREE.Object3D>
  mat: THREE.Material
  ledMat: THREE.Material
}) {
  const width = useConfigSelector((s) => s.width)
  const depth = useConfigSelector((s) => s.depth)
  const mounting = useConfigSelector((s) => s.mounting)
  const sides = useConfigSelector((s) => s.sides)
  const ledColumn = useConfigSelector((s) => s.ledColumn)

  if (mounting === 'wall2') {
    return null
  }

  // Determine active columns and their mirror scales
  const corners: Array<{ sa: SideKey; sb: SideKey; x: number; z: number; sx: number; sz: number }> = [
    { sa: 'L', sb: 'F', x: -width / 2, z: depth / 2, sx: 1, sz: 1 },
    { sa: 'R', sb: 'F', x: width / 2, z: depth / 2, sx: -1, sz: 1 }
  ]

  if (mounting === 'free') {
    corners.push({ sa: 'L', sb: 'B', x: -width / 2, z: -depth / 2, sx: 1, sz: -1 })
    corners.push({ sa: 'R', sb: 'B', x: width / 2, z: -depth / 2, sx: -1, sz: -1 })
  }

  const colFor = (a: SideKey, b: SideKey): THREE.Object3D => {
    const hasPanel2 = [a, b].some((k) => sides[k]?.system === 'panel2')
    return hasPanel2 ? nodes.col_double : nodes.col_single
  }

  return (
    <group>
      {corners.map(({ sa, sb, x, z, sx, sz }) => {
        const col = colFor(sa, sb)
        return (
          <group key={`${sa}${sb}`} position={[x, 0, z]}>
            {/* Main Column Body */}
            <Part
              node={col}
              anchor="baseCenter"
              scale={[sx, 1, sz]}
              material={mat}
            />

            {/* Native External Column LED Bar */}
            {ledColumn && nodes.col_led && (
              <Part
                node={nodes.col_led}
                anchor="baseCenter"
                scale={[sx, 1, sz]}
                material={ledMat}
                castShadow={false}
              />
            )}
          </group>
        )
      })}
    </group>
  )
}

/**
 * Perimeter Beams, Corner Castings, and Native Beam LEDs.
 *
 * Exact Blender CAD Mirroring & Assembly:
 * - Column head top is at y = H (1.986m).
 * - Perimeter beams sit ON TOP of column heads: bottom at y = H, top at y = H + 0.1816m (~2.168m).
 * - Front Beam (+Z): base orientation (gutter and inner channel face -Z, into pergola).
 * - Back Beam (-Z): Mirrored on Z (scale.z = -1) so gutter and inner channel face +Z (into pergola)!
 * - Left Beam (-X): base orientation (inner channel faces +X, into pergola).
 * - Right Beam (+X): Mirrored on X (scale.x = -1) so inner channel faces -X (into pergola)!
 * - Corner Nodes: Mirrored across X and Z to match each corner's handedness.
 * - Native Beam LED: when ledBeam is active, renders nodes.beam_led along the inner beam ledge.
 */
function BeamsAndFrame({
  nodes,
  structureMat,
  ledMat
}: {
  nodes: Record<string, THREE.Object3D>
  structureMat: THREE.Material
  ledMat: THREE.Material
}) {
  const width = useConfigSelector((s) => s.width)
  const depth = useConfigSelector((s) => s.depth)
  const H = useConfigSelector((s) => s.height)
  const ledBeam = useConfigSelector((s) => s.ledBeam)

  const bx = useMemo(() => localBox(nodes.beam_x), [nodes.beam_x])
  const bz = useMemo(() => localBox(nodes.beam_z), [nodes.beam_z])
  const sliceX = Math.max(0.005, bx.max.x - bx.min.x)
  const sliceZ = Math.max(0.005, bz.max.z - bz.min.z)

  // Corner nodes positions and mirror scales:
  const corners: Array<{ pos: [number, number, number]; sx: number; sz: number }> = [
    { pos: [-width / 2, H, depth / 2], sx: 1, sz: 1 },
    { pos: [width / 2, H, depth / 2], sx: -1, sz: 1 },
    { pos: [-width / 2, H, -depth / 2], sx: 1, sz: -1 },
    { pos: [width / 2, H, -depth / 2], sx: -1, sz: -1 }
  ]

  const ledNode = nodes.beam_led
  const ledSliceX = useMemo(() => {
    if (!ledNode) return 1
    const b = localBox(ledNode)
    return Math.max(0.005, b.max.x - b.min.x)
  }, [ledNode])

  return (
    <group>
      {/* Front (+z) Beam: Base orientation, inner gutter faces -z */}
      <Part
        node={nodes.beam_x}
        anchor="bottomCenter"
        position={[0, H, depth / 2]}
        scale={[width / sliceX, 1, 1]}
        material={structureMat}
      />

      {/* Back (-z) Beam: Mirrored on Z (scale.z = -1) so inner gutter faces +z into pergola */}
      <Part
        node={nodes.beam_x}
        anchor="bottomCenter"
        position={[0, H, -depth / 2]}
        scale={[width / sliceX, 1, -1]}
        material={structureMat}
      />

      {/* Left (-x) Beam: Base orientation, inner channel faces +x */}
      <Part
        node={nodes.beam_z}
        anchor="bottomCenter"
        position={[-width / 2, H, 0]}
        scale={[1, 1, depth / sliceZ]}
        material={structureMat}
      />

      {/* Right (+x) Beam: Mirrored on X (scale.x = -1) so inner channel faces -x into pergola */}
      <Part
        node={nodes.beam_z}
        anchor="bottomCenter"
        position={[width / 2, H, 0]}
        scale={[-1, 1, depth / sliceZ]}
        material={structureMat}
      />

      {/* Corner Junction Nodes on Column Heads (Mirrored for authentic corner geometry) */}
      {corners.map((c, i) => (
        <Part
          key={i}
          node={nodes.corner_node}
          anchor="bottomCenter"
          position={c.pos}
          scale={[c.sx, 1, c.sz]}
          material={structureMat}
        />
      ))}

      {/* Native Beam LED Strips running in beam slot */}
      {ledBeam && ledNode && (
        <group position={[0, H + 0.014, 0]}>
          {/* Front Beam LED */}
          <Part
            node={ledNode}
            anchor="center"
            position={[0, 0, depth / 2 - 0.045]}
            scale={[width / ledSliceX, 1, 1]}
            material={ledMat}
            castShadow={false}
          />
          {/* Back Beam LED (mirrored on Z) */}
          <Part
            node={ledNode}
            anchor="center"
            position={[0, 0, -depth / 2 + 0.045]}
            scale={[width / ledSliceX, 1, -1]}
            material={ledMat}
            castShadow={false}
          />
          {/* Left Beam LED */}
          <Part
            node={ledNode}
            anchor="center"
            position={[-width / 2 + 0.045, 0, 0]}
            rotation={[0, Math.PI / 2, 0]}
            scale={[depth / ledSliceX, 1, 1]}
            material={ledMat}
            castShadow={false}
          />
          {/* Right Beam LED */}
          <Part
            node={ledNode}
            anchor="center"
            position={[width / 2 - 0.045, 0, 0]}
            rotation={[0, -Math.PI / 2, 0]}
            scale={[depth / ledSliceX, 1, 1]}
            material={ledMat}
            castShadow={false}
          />
        </group>
      )}
    </group>
  )
}

/**
 * Roof Louvers:
 * - Positioned at y = 2.131m inside the perimeter beams (Blender CAD specification).
 * - Render BOTH the extruded blade ('slat') and the rotating fulcrum cylinders ('slat_hinge_fixed')
 *   at the outer ends of the blade (resting flush against the blade caps, without cutting into the profile).
 * - Spacing pitch ~ 0.12m ensures closed blades overlap watertight without light gaps.
 * - Kinematics speed HALVED for slow, stately, elegant mechanical transitions.
 */
function Louvers({
  nodes,
  mat
}: {
  nodes: Record<string, THREE.Object3D>
  mat: THREE.Material
}) {
  const width = useConfigSelector((s) => s.width)
  const depth = useConfigSelector((s) => s.depth)
  const targetAngleDeg = useConfigSelector((s) => s.louverAngle)
  const packed = useConfigSelector((s) => s.louverPacked)
  const H = useConfigSelector((s) => s.height)

  const box = useMemo(() => localBox(nodes.slat), [nodes.slat])
  const slice = Math.max(0.005, box.max.x - box.min.x)

  // Watertight pitch: blade depth is 0.1256m, pitch <= 0.122m guarantees full watertight overlap at 0°
  const K = clamp(Math.round(depth / 0.12), 6, 60)
  const pitch = depth / K

  // Span between internal beam inner ledges
  const louverWidth = Math.max(0.5, width - 0.24)

  // Louver elevation: center of rotation encased in perimeter beam at 2.131m
  const louverY = H + 0.145

  // Animation lerp state — DAMPING FACTOR HALVED (from 5 to 2.2) for stately half-speed animation
  const animPackRef = useRef(packed ? 1 : 0)
  const animAngleRef = useRef(THREE.MathUtils.degToRad(targetAngleDeg))
  const groupRefs = useRef<Array<THREE.Group | null>>([])

  useFrame((_, delta) => {
    const targetPack = packed ? 1 : 0
    const targetRad = packed ? Math.PI / 2 : THREE.MathUtils.degToRad(targetAngleDeg)

    // Halved speed as requested: 2.2 and 3.5
    animPackRef.current = THREE.MathUtils.damp(animPackRef.current, targetPack, 2.2, delta)
    animAngleRef.current = THREE.MathUtils.damp(animAngleRef.current, targetRad, 3.5, delta)

    const p = animPackRef.current
    const ang = animAngleRef.current

    // Update each blade group's position & rotation directly for 60fps buttery smoothness
    for (let i = 0; i < K; i++) {
      const g = groupRefs.current[i]
      if (!g) continue

      const normalZ = -depth / 2 + pitch / 2 + i * pitch
      const packedPitch = Math.min(0.032, (depth * 0.28) / K)
      const packedZ = -depth / 2 + 0.15 + i * packedPitch

      g.position.z = THREE.MathUtils.lerp(normalZ, packedZ, p)
      g.rotation.x = ang
    }
  })

  return (
    <group position={[0, louverY, 0]}>
      {Array.from({ length: K }).map((_, i) => {
        const initialNormalZ = -depth / 2 + pitch / 2 + i * pitch

        return (
          <group
            key={i}
            ref={(el) => {
              groupRefs.current[i] = el
            }}
            position={[0, 0, initialNormalZ]}
          >
            {/* Louver Blade */}
            <Part
              node={nodes.slat}
              anchor="center"
              position={[0, 0, 0]}
              scale={[louverWidth / slice, 1, 1]}
              material={mat}
              castShadow={true}
            />

            {/* Left Fulcrum Cylinder resting flush on left end */}
            <Part
              node={nodes.slat_hinge_fixed}
              anchor="center"
              position={[-louverWidth / 2, 0, 0]}
              scale={[1, 1, 1]}
              material={mat}
              castShadow={true}
            />

            {/* Right Fulcrum Cylinder resting flush on right end (mirrored) */}
            <Part
              node={nodes.slat_hinge_fixed}
              anchor="center"
              position={[louverWidth / 2, 0, 0]}
              scale={[-1, 1, 1]}
              material={mat}
              castShadow={true}
            />
          </group>
        )
      })}
    </group>
  )
}

/**
 * Side Closures:
 * - Screens:
 *   - 'panel1': Single roller cassette + drop fabric
 *   - 'panel2': Dual tandem rollers (Estate solar shade + Inverno thermal screen) side by side under beam
 * - Glass (Vetrate Panoramiche):
 *   - Fixed top guide and floor track spanning the entire opening (they NEVER follow or move with the doors!)
 *   - Glass seated at y = 0.006 inside floor track channel without sinking into the ground
 *   - Number of panes ALWAYS EVEN (2N: 4, 6, 8...)
 *   - Double central French doors: leaves N-1 and N meet at center and swing outward left & right
 *   - Outer leaves stay fixed in place
 */
function Sides({
  nodes,
  structureMat,
  fabricMat,
  glassMat
}: {
  nodes: Record<string, THREE.Object3D>
  structureMat: THREE.Material
  fabricMat: THREE.Material
  glassMat: THREE.Material
}) {
  const width = useConfigSelector((s) => s.width)
  const depth = useConfigSelector((s) => s.depth)
  const H = useConfigSelector((s) => s.height)
  const sides = useConfigSelector((s) => s.sides)
  const mounting = useConfigSelector((s) => s.mounting)

  const fabThermal = useMemo(() => localBox(nodes.panel_thermal_fabric), [nodes.panel_thermal_fabric])
  const fabricSliceX = Math.max(0.005, fabThermal.max.x - fabThermal.min.x)
  const fabricDropY = Math.max(0.01, fabThermal.max.y - fabThermal.min.y)

  const glassSliceZ = useMemo(() => {
    const b = localBox(nodes.glass_pane)
    return Math.max(0.005, b.max.z - b.min.z)
  }, [nodes.glass_pane])

  const trackNode = nodes.glass_track || nodes.fessura_porte
  const trackSliceX = useMemo(() => {
    if (!trackNode) return 1
    const b = localBox(trackNode)
    return Math.max(0.005, b.max.x - b.min.x)
  }, [trackNode])

  const geoms: Record<SideKey, { along: 'x' | 'z'; center: [number, number, number]; normal: number }> = {
    F: { along: 'x', center: [0, 0, depth / 2], normal: 1 },
    B: { along: 'x', center: [0, 0, -depth / 2], normal: -1 },
    L: { along: 'z', center: [-width / 2, 0, 0], normal: -1 },
    R: { along: 'z', center: [width / 2, 0, 0], normal: 1 }
  }

  // Effective glass height from ground track channel (0.006) to under-beam guide channel (H - 0.006)
  const glassPaneHeightCAD = 1.9746
  const glassYScale = (H - 0.012) / glassPaneHeightCAD

  return (
    <group>
      {SIDE_KEYS.map((k) => {
        // If attached to a wall, omit side closures on that wall side
        if (mounting === 'wall1' && k === 'B') return null
        if (mounting === 'wall2' && (k === 'B' || k === 'L')) return null

        const sc = sides[k]
        if (sc.system === 'none') return null
        const g = geoms[k]
        const isX = g.along === 'x'
        const span = isX ? width - 0.24 : depth - 0.24

        const fabRotY = isX ? 0 : Math.PI / 2
        const glassRotY = isX ? Math.PI / 2 : 0

        // ================= SCREENS (1 or 2 Tende) =================
        if (sc.system === 'panel1' || sc.system === 'panel2') {
          const dropHeight = THREE.MathUtils.clamp(sc.opening * (H - 0.06), 0.02, H - 0.06)
          const dropScale = dropHeight / fabricDropY

          const isPanel2 = sc.system === 'panel2'

          return (
            <group key={k} position={[g.center[0], H, g.center[2]]} rotation={[0, fabRotY, 0]}>
              {/* Single Screen: 1 cassette + fabric */}
              {!isPanel2 ? (
                <group position={[0, -0.002, 0]}>
                  <Part
                    node={sc.fabric === 'shade' ? nodes.panel_shade_housing : nodes.panel_thermal_housing}
                    anchor="topCenter"
                    scale={[span / fabricSliceX, 1, 1]}
                    material={structureMat}
                  />
                  <Part
                    node={sc.fabric === 'shade' ? nodes.panel_shade_fabric : nodes.panel_thermal_fabric}
                    anchor="topCenter"
                    scale={[span / fabricSliceX, dropScale, 1]}
                    material={fabricMat}
                    castShadow={true}
                  />
                </group>
              ) : (
                /* Dual Screen (2 Tende Estate/Inverno): 2 tandem cassettes under the beam */
                <group position={[0, -0.002, 0]}>
                  {/* Cassette 1: Outdoor Sun Shade (Estate) */}
                  <group position={[0, 0, 0.03]}>
                    <Part
                      node={nodes.panel_shade_housing}
                      anchor="topCenter"
                      scale={[span / fabricSliceX, 1, 1]}
                      material={structureMat}
                    />
                    {sc.fabric === 'shade' && (
                      <Part
                        node={nodes.panel_shade_fabric}
                        anchor="topCenter"
                        scale={[span / fabricSliceX, dropScale, 1]}
                        material={fabricMat}
                        castShadow={true}
                      />
                    )}
                  </group>

                  {/* Cassette 2: Indoor Thermal Wind Screen (Inverno) */}
                  <group position={[0, 0, -0.03]}>
                    <Part
                      node={nodes.panel_thermal_housing}
                      anchor="topCenter"
                      scale={[span / fabricSliceX, 1, 1]}
                      material={structureMat}
                    />
                    {sc.fabric === 'thermal' && (
                      <Part
                        node={nodes.panel_thermal_fabric}
                        anchor="topCenter"
                        scale={[span / fabricSliceX, dropScale, 1]}
                        material={fabricMat}
                        castShadow={true}
                      />
                    )}
                  </group>
                </group>
              )}
            </group>
          )
        }

        // ================= PANORAMIC GLASS SYSTEM =================
        if (sc.system === 'glass') {
          // ALWAYS AN EVEN NUMBER OF PANES: 2N (e.g. 4, 6, 8...)
          const N = Math.max(2, Math.round((span / 2) / 0.8))
          const count = 2 * N
          const doorW = span / count
          const zScale = doorW / glassSliceZ

          // The two central French door leaves that meet at center line:
          const leftDoorIdx = N - 1
          const rightDoorIdx = N

          return (
            <group key={k} position={[g.center[0], 0, g.center[2]]} rotation={[0, glassRotY, 0]}>
              {/* FIXED Floor Track resting on ground (NEVER moves when doors open) */}
              {trackNode && (
                <Part
                  node={trackNode}
                  anchor="center"
                  position={[0, 0.003, 0]}
                  scale={[span / trackSliceX, 1, 1]}
                  material={structureMat}
                  castShadow={false}
                />
              )}

              {/* FIXED Top Guide Channel mounted under the beam (NEVER moves when doors open) */}
              {trackNode && (
                <Part
                  node={trackNode}
                  anchor="center"
                  position={[0, H - 0.004, 0]}
                  scale={[span / trackSliceX, 1, 1]}
                  material={structureMat}
                  castShadow={false}
                />
              )}

              {/* Glass Panes */}
              {Array.from({ length: count }).map((_, i) => {
                const normalOff = -span / 2 + doorW / 2 + i * doorW

                if (sc.glassOpen === 'center') {
                  // Double Central French Doors (Leaves N-1 and N)
                  const isLeftDoor = i === leftDoorIdx
                  const isRightDoor = i === rightDoorIdx

                  if (isLeftDoor) {
                    // Left French door leaf: hinges at outer edge (-doorW / 2), swings outward left (-angle)
                    const openAngle = -sc.opening * (Math.PI * 0.52)
                    return (
                      <group key={i} position={[0, 0, normalOff]}>
                        <group position={[0, 0, -doorW / 2]} rotation={[0, g.normal * openAngle, 0]}>
                          <Part
                            node={nodes.glass_pane}
                            anchor="bottomCenter"
                            position={[0, 0.006, doorW / 2]}
                            scale={[1, glassYScale, zScale]}
                            material={glassMat}
                            castShadow={false}
                          />
                        </group>
                      </group>
                    )
                  } else if (isRightDoor) {
                    // Right French door leaf: hinges at outer edge (+doorW / 2), swings outward right (+angle)
                    const openAngle = sc.opening * (Math.PI * 0.52)
                    return (
                      <group key={i} position={[0, 0, normalOff]}>
                        <group position={[0, 0, doorW / 2]} rotation={[0, g.normal * openAngle, 0]}>
                          <Part
                            node={nodes.glass_pane}
                            anchor="bottomCenter"
                            position={[0, 0.006, -doorW / 2]}
                            scale={[1, glassYScale, zScale]}
                            material={glassMat}
                            castShadow={false}
                          />
                        </group>
                      </group>
                    )
                  } else {
                    // Stationary outer panoramic glass panels
                    return (
                      <group key={i} position={[0, 0, normalOff]}>
                        <Part
                          node={nodes.glass_pane}
                          anchor="bottomCenter"
                          position={[0, 0.006, 0]}
                          scale={[1, glassYScale, zScale]}
                          material={glassMat}
                          castShadow={false}
                        />
                      </group>
                    )
                  }
                } else {
                  // Accordion / Slide-to-side pack
                  const packedOff = -span / 2 + 0.08 + i * 0.045
                  const currentOff = THREE.MathUtils.lerp(normalOff, packedOff, sc.opening)
                  const openAng = sc.opening * (Math.PI * 0.45)

                  return (
                    <group key={i} position={[0, 0, currentOff]} rotation={[0, g.normal * openAng, 0]}>
                      <Part
                        node={nodes.glass_pane}
                        anchor="bottomCenter"
                        position={[0, 0.006, 0]}
                        scale={[1, glassYScale, zScale]}
                        material={glassMat}
                        castShadow={false}
                      />
                    </group>
                  )
                }
              })}
            </group>
          )
        }

        return null
      })}
    </group>
  )
}

export function Pergola() {
  const { nodes } = useGLTF(LIB_URL)
  const cfg = useConfigSelector((s) => s)

  // Dynamic PBR Materials for authentic architectural finishes
  const { structureMat, fabricMat, glassMat, ledMat } = useMemo(() => {
    const sMat = new THREE.MeshStandardMaterial({
      color: cfg.colors.structure,
      roughness: cfg.colors.structureRoughness,
      metalness: cfg.colors.structureMetalness,
      envMapIntensity: 1.1,
      side: THREE.DoubleSide
    })

    const fMat = new THREE.MeshStandardMaterial({
      color: cfg.colors.fabric,
      roughness: 0.65,
      metalness: 0.05,
      side: THREE.DoubleSide
    })

    const gMat = new THREE.MeshPhysicalMaterial({
      color: cfg.colors.glass,
      transmission: cfg.colors.glassTransmission,
      opacity: cfg.colors.glassOpacity,
      transparent: true,
      roughness: 0.04,
      ior: 1.52,
      thickness: 0.02,
      side: THREE.DoubleSide,
      depthWrite: false
    })

    const isLedOn = cfg.ledBeam || cfg.ledColumn || cfg.led
    const lMat = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      emissive: isLedOn ? new THREE.Color('#ffe0a0') : new THREE.Color('#111111'),
      emissiveIntensity: isLedOn ? 3.5 : 0.0,
      roughness: 0.3,
      side: THREE.DoubleSide
    })

    return { structureMat: sMat, fabricMat: fMat, glassMat: gMat, ledMat: lMat }
  }, [cfg.colors, cfg.led, cfg.ledBeam, cfg.ledColumn])

  return (
    <group>
      <WallMounting />
      <Columns nodes={nodes} mat={structureMat} ledMat={ledMat} />
      <BeamsAndFrame nodes={nodes} structureMat={structureMat} ledMat={ledMat} />
      <Louvers nodes={nodes} mat={structureMat} />
      <Sides nodes={nodes} structureMat={structureMat} fabricMat={fabricMat} glassMat={glassMat} />
    </group>
  )
}

export { NODE_NAMES }