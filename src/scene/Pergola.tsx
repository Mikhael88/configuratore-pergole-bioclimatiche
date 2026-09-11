import { useMemo, useRef, useEffect } from 'react'
import { useGLTF, useTexture } from '@react-three/drei'
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
  onChildMesh?: (mesh: THREE.Mesh) => void
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
  onChildMesh,
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
        onChildMesh?.(mesh)
      }
    })
    return c
  }, [node, material, castShadow, receiveShadow, onChildMesh])

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
function ColumnLed({
  node,
  scale,
  mat
}: {
  node: THREE.Object3D
  scale: [number, number, number]
  mat: THREE.Material
}) {
  const cloned = useMemo(() => {
    const c = node.clone(true)
    c.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh
        mesh.material = mat
        mesh.castShadow = false
        mesh.receiveShadow = false
        mesh.renderOrder = 10
      }
    })
    return c
  }, [node, mat])

  return (
    <group scale={scale}>
      <primitive object={cloned} />
    </group>
  )
}

/**
 * Columns:
 * - 'free': 4 vertical structural columns
 * - 'wall1': 2 front columns (rear anchored into wall)
 * - 'wall2': 1 front-right column (anchored into corner rear & left walls)
 * - 'wall_opposed': 0 columns (pergola spans between 2 opposed parallel walls)
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
  const H = useConfigSelector((s) => s.height)
  const mounting = useConfigSelector((s) => s.mounting)
  const sides = useConfigSelector((s) => s.sides)
  const ledColumn = useConfigSelector((s) => s.ledColumn)

  if (mounting === 'wall_opposed') {
    return null
  }

  // Dynamic vertical scaling from CAD base height (computed directly from model)
  const colHeightCAD = useMemo(() => {
    if (!nodes.col_single) return 1.9100
    const b = localBox(nodes.col_single)
    return Math.max(0.5, b.max.y - b.min.y)
  }, [nodes.col_single])

  const colScaleY = H / colHeightCAD

  // Determine active columns and their mirror scales
  let corners: Array<{ sa: SideKey; sb: SideKey; x: number; z: number; sx: number; sz: number }> = []

  if (mounting === 'wall2') {
    // 2 perpendicular walls (Back & Left): exactly 1 column at Front-Right corner (+X, +Z)
    corners = [{ sa: 'R', sb: 'F', x: width / 2, z: depth / 2, sx: -1, sz: 1 }]
  } else if (mounting === 'wall1') {
    // 1 rear wall: 2 front columns
    corners = [
      { sa: 'L', sb: 'F', x: -width / 2, z: depth / 2, sx: 1, sz: 1 },
      { sa: 'R', sb: 'F', x: width / 2, z: depth / 2, sx: -1, sz: 1 }
    ]
  } else {
    // Freestanding: 4 columns
    corners = [
      { sa: 'L', sb: 'F', x: -width / 2, z: depth / 2, sx: 1, sz: 1 },
      { sa: 'R', sb: 'F', x: width / 2, z: depth / 2, sx: -1, sz: 1 },
      { sa: 'L', sb: 'B', x: -width / 2, z: -depth / 2, sx: 1, sz: -1 },
      { sa: 'R', sb: 'B', x: width / 2, z: -depth / 2, sx: -1, sz: -1 }
    ]
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
            {/* Main Column Body — dynamically stretched to height H */}
            <Part
              node={col}
              anchor="baseCenter"
              scale={[sx, colScaleY, sz]}
              material={mat}
            />

            {/* Native External Column LED Strip rendered directly at column origin with exact CAD alignment */}
            {ledColumn && nodes.col_led && (
              <ColumnLed
                node={nodes.col_led}
                scale={[sx, colScaleY, sz]}
                mat={ledMat}
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


  // Beams extended slightly into corner nodes (+0.08m) to eliminate the corner square notch
  const beamXScale = (width + 0.08) / sliceX
  const beamZScale = (depth + 0.08) / sliceZ

  // Configure native CAD LED strips parented inside beam profiles
  const setupBeamMesh = useMemo(
    () => (mesh: THREE.Mesh) => {
      if (mesh.name.includes('led') || mesh.name.includes('LED')) {
        mesh.material = ledMat
        mesh.visible = ledBeam
        mesh.castShadow = false
        mesh.receiveShadow = false
      }
    },
    [ledMat, ledBeam]
  )

  return (
    <group>
      {/* Front (+z) Beam: Base orientation, inner gutter faces -z */}
      <Part
        node={nodes.beam_x}
        anchor="bottomCenter"
        position={[0, H, depth / 2]}
        scale={[beamXScale, 1, 1]}
        material={structureMat}
        onChildMesh={setupBeamMesh}
      />

      {/* Back (-z) Beam: Mirrored on Z (scale.z = -1) so inner gutter faces +z into pergola */}
      <Part
        node={nodes.beam_x}
        anchor="bottomCenter"
        position={[0, H, -depth / 2]}
        scale={[beamXScale, 1, -1]}
        material={structureMat}
        onChildMesh={setupBeamMesh}
      />

      {/* Left (-x) Beam: Base orientation, inner channel faces +x */}
      <Part
        node={nodes.beam_z}
        anchor="bottomCenter"
        position={[-width / 2, H, 0]}
        scale={[1, 1, beamZScale]}
        material={structureMat}
        onChildMesh={setupBeamMesh}
      />

      {/* Right (+x) Beam: Mirrored on X (scale.x = -1) so inner channel faces -x into pergola */}
      <Part
        node={nodes.beam_z}
        anchor="bottomCenter"
        position={[width / 2, H, 0]}
        scale={[-1, 1, beamZScale]}
        material={structureMat}
        onChildMesh={setupBeamMesh}
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

  const hingeBox = useMemo(() => localBox(nodes.slat_hinge_fixed), [nodes.slat_hinge_fixed])
  const pernoW = Math.max(0.01, hingeBox.max.x - hingeBox.min.x) // ~0.0455m

  // Watertight pitch: blade depth is 0.1256m, pitch <= 0.122m guarantees full watertight overlap at 0°
  const K = clamp(Math.round(depth / 0.12), 6, 60)
  const pitch = depth / K

  // Total span reaching directly inside side beam hinge channels (traverso-fessura-P)
  const totalLouverSpan = Math.max(0.5, width - 0.03)
  // Louver blade width spans completely between the two hinge pins with NO gaps
  const slatWidth = Math.max(0.4, totalLouverSpan - 2 * pernoW)

  // Louver elevation: center of rotation encased in perimeter beam
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
              scale={[slatWidth / slice, 1, 1]}
              material={mat}
              castShadow={true}
            />

            {/* Left Fulcrum Cylinder resting flush externally against the left blade end (no penetration) */}
            <Part
              node={nodes.slat_hinge_fixed}
              anchor="center"
              position={[-slatWidth / 2 - pernoW / 2, 0, 0]}
              scale={[1, 1, 1]}
              material={mat}
              castShadow={true}
            />

            {/* Right Fulcrum Cylinder resting flush externally against the right blade end (mirrored) */}
            <Part
              node={nodes.slat_hinge_fixed}
              anchor="center"
              position={[slatWidth / 2 + pernoW / 2, 0, 0]}
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
interface ScreenSideProps {
  position: [number, number, number]
  rotation: [number, number, number]
  screenSpan: number
  height: number
  opening: number
  extOpening?: number
  isDual: boolean
  nodes: Record<string, THREE.Object3D>
  structureMat: THREE.Material
  kristallMat: THREE.Material
  textures: {
    soltisDiff: THREE.Texture
    soltisNorm: THREE.Texture
    ferrariDiff: THREE.Texture
    ferrariNorm: THREE.Texture
  }
  weave: 'soltis' | 'ferrari'
  fabricColor: string
  fabricSliceX: number
  fabricDropY: number
}

function ScreenSide({
  position,
  rotation,
  screenSpan,
  height,
  opening,
  extOpening,
  isDual,
  nodes,
  structureMat,
  kristallMat,
  textures,
  weave,
  fabricColor,
  fabricSliceX,
  fabricDropY
}: ScreenSideProps) {
  const intDropHeight = THREE.MathUtils.clamp(opening * (height - 0.06), 0.02, height - 0.06)
  const intDropScale = intDropHeight / fabricDropY

  const actualExtOpening = extOpening ?? opening
  const extDropHeight = THREE.MathUtils.clamp(actualExtOpening * (height - 0.06), 0.02, height - 0.06)
  const extDropScale = extDropHeight / fabricDropY

  // Metric proportional repeat based on curtain physical dimensions (screenSpan and intDropHeight):
  // 1) Replicated at least 4x on width to start with (4x)
  // 2) Plus an additional 4x tiling on both axes (U & V / width & height)
  // Total width: 16x; Total height: 4x (with 5x ratio for Serge Ferrari)
  const baseTiling = weave === 'ferrari' ? 5.0 : 1.0
  const repX = baseTiling * 16.0 * screenSpan
  const repY = baseTiling * 4.0 * intDropHeight

  const { fabricMat, diffTex, normTex } = useMemo(() => {
    const rawDiff = weave === 'ferrari' ? textures.ferrariDiff : textures.soltisDiff
    const rawNorm = weave === 'ferrari' ? textures.ferrariNorm : textures.soltisNorm

    // Cloned textures so each side has independent repeat scaling without duplicating GPU VRAM
    const diff = rawDiff.clone()
    const norm = rawNorm.clone()

    diff.wrapS = diff.wrapT = THREE.RepeatWrapping
    norm.wrapS = norm.wrapT = THREE.RepeatWrapping
    diff.colorSpace = THREE.SRGBColorSpace

    const mat = new THREE.MeshStandardMaterial({
      color: fabricColor,
      map: diff,
      normalMap: norm,
      normalScale: new THREE.Vector2(0.75, 0.75),
      roughness: 0.85,
      metalness: 0.04,
      transparent: true,
      alphaTest: 0.05,
      depthWrite: true,
      side: THREE.DoubleSide
    })

    return { fabricMat: mat, diffTex: diff, normTex: norm }
  }, [weave, fabricColor, textures])

  // Dynamically update texture repeats as pergola width, depth or curtain drop change
  useMemo(() => {
    diffTex.repeat.set(repX, repY)
    normTex.repeat.set(repX, repY)
  }, [diffTex, normTex, repX, repY])

  useEffect(() => {
    return () => {
      diffTex.dispose()
      normTex.dispose()
      fabricMat.dispose()
    }
  }, [diffTex, normTex, fabricMat])

  const fabricNode = nodes.panel_shade_fabric || nodes.panel_thermal_fabric
  const housingNode = nodes.panel_shade_housing || nodes.panel_thermal_housing

  return (
    <group position={position} rotation={rotation}>
      {!isDual ? (
        <group position={[0, -0.002, 0]}>
          {/* Fabric unrolls from top down to intDropHeight */}
          <Part
            node={fabricNode}
            anchor="topCenter"
            scale={[screenSpan / fabricSliceX, intDropScale, 1]}
            material={fabricMat}
            castShadow={true}
          />
          {/* Bottom closure bar with silicone seal facing DOWN, glides down with fabric */}
          <Part
            node={housingNode}
            anchor="topCenter"
            position={[0, -intDropHeight, 0]}
            rotation={[Math.PI, 0, 0]}
            scale={[screenSpan / fabricSliceX, 1, 1]}
            material={structureMat}
          />
        </group>
      ) : (
        /* Dual Screen (2 Tende): 2 tandem rollers side by side
           - Track 1 (External, +0.035): Transparent PVC Kristall
           - Track 2 (Internal, -0.035): Shade fabric
        */
        <group position={[0, -0.002, 0]}>
          {/* Track 1: Outdoor Clear PVC Kristall Screen */}
          <group position={[0, 0, 0.035]}>
            <Part
              node={fabricNode}
              anchor="topCenter"
              scale={[screenSpan / fabricSliceX, extDropScale, 1]}
              material={kristallMat}
              castShadow={false}
            />
            <Part
              node={housingNode}
              anchor="topCenter"
              position={[0, -extDropHeight, 0]}
              rotation={[Math.PI, 0, 0]}
              scale={[screenSpan / fabricSliceX, 1, 1]}
              material={structureMat}
            />
          </group>

          {/* Track 2: Indoor Sun Shade Fabric */}
          <group position={[0, 0, -0.035]}>
            <Part
              node={fabricNode}
              anchor="topCenter"
              scale={[screenSpan / fabricSliceX, intDropScale, 1]}
              material={fabricMat}
              castShadow={true}
            />
            <Part
              node={housingNode}
              anchor="topCenter"
              position={[0, -intDropHeight, 0]}
              rotation={[Math.PI, 0, 0]}
              scale={[screenSpan / fabricSliceX, 1, 1]}
              material={structureMat}
            />
          </group>
        </group>
      )}
    </group>
  )
}

function Sides({
  nodes,
  structureMat,
  kristallMat,
  glassMat,
  textures,
  weave,
  fabricColor
}: {
  nodes: Record<string, THREE.Object3D>
  structureMat: THREE.Material
  kristallMat: THREE.Material
  glassMat: THREE.Material
  textures: {
    soltisDiff: THREE.Texture
    soltisNorm: THREE.Texture
    ferrariDiff: THREE.Texture
    ferrariNorm: THREE.Texture
  }
  weave: 'soltis' | 'ferrari'
  fabricColor: string
}) {
  const width = useConfigSelector((s) => s.width)
  const depth = useConfigSelector((s) => s.depth)
  const H = useConfigSelector((s) => s.height)
  const sides = useConfigSelector((s) => s.sides)
  const mounting = useConfigSelector((s) => s.mounting)

  const fabThermal = useMemo(
    () => localBox(nodes.panel_thermal_fabric || nodes.panel_shade_fabric),
    [nodes.panel_thermal_fabric, nodes.panel_shade_fabric]
  )
  const fabricSliceX = Math.max(0.005, fabThermal.max.x - fabThermal.min.x)
  const fabricDropY = Math.max(0.01, fabThermal.max.y - fabThermal.min.y)

  const glassBox = useMemo(() => localBox(nodes.glass_pane), [nodes.glass_pane])
  const glassSliceX = Math.max(0.005, glassBox.max.x - glassBox.min.x)
  const glassPaneHeightCAD = Math.max(0.1, glassBox.max.y - glassBox.min.y)

  const trackNode = nodes.glass_track || nodes.fessura_porte
  const trackSliceX = useMemo(() => {
    if (!trackNode) return 1
    const b = localBox(trackNode)
    return Math.max(0.005, b.max.x - b.min.x)
  }, [trackNode])

  // Setup dual materials for split CAD glass leaf: glass_pane receives glassMat, child glass_frame receives structureMat
  const setupGlassMesh = useMemo(
    () => (mesh: THREE.Mesh) => {
      if (mesh.name.includes('frame') || mesh.name.includes('alluminio')) {
        mesh.material = structureMat
        mesh.castShadow = true
        mesh.receiveShadow = true
      } else {
        mesh.material = glassMat
        mesh.castShadow = false
        mesh.receiveShadow = true
      }
    },
    [structureMat, glassMat]
  )

  const geoms: Record<SideKey, { along: 'x' | 'z'; center: [number, number, number]; normal: number }> = {
    F: { along: 'x', center: [0, 0, depth / 2], normal: 1 },
    B: { along: 'x', center: [0, 0, -depth / 2], normal: -1 },
    L: { along: 'z', center: [-width / 2, 0, 0], normal: -1 },
    R: { along: 'z', center: [width / 2, 0, 0], normal: 1 }
  }

  // Effective glass height from ground track channel (0.006) to under-beam guide channel (H - 0.006)
  const glassYScale = (H - 0.012) / glassPaneHeightCAD

  return (
    <group>
      {SIDE_KEYS.map((k) => {
        // If attached to a wall, omit side closures on that wall side
        if (mounting === 'wall1' && k === 'B') return null
        if (mounting === 'wall2' && (k === 'B' || k === 'L')) return null
        if (mounting === 'wall_opposed' && (k === 'L' || k === 'R')) return null

        const sc = sides[k]
        if (sc.system === 'none') return null
        const g = geoms[k]
        const isX = g.along === 'x'
        // Screen fabric and bottom bar extend into the vertical column grooves (fessure)
        const screenSpan = isX ? width - 0.13 : depth - 0.13
        const glassSpan = isX ? width - 0.24 : depth - 0.24

        // Outward orientation so local +Z is ALWAYS facing OUTWARDS, and local +X spans the opening
        const sideRotY = isX ? (k === 'F' ? 0 : Math.PI) : (k === 'R' ? -Math.PI / 2 : Math.PI / 2)

        // ================= SCREENS (1 or 2 Tende) =================
        if (sc.system === 'panel1' || sc.system === 'panel2') {
          return (
            <ScreenSide
              key={k}
              position={[g.center[0], H, g.center[2]]}
              rotation={[0, sideRotY, 0]}
              screenSpan={screenSpan}
              height={H}
              opening={sc.opening}
              extOpening={sc.openingExternal}
              isDual={sc.system === 'panel2'}
              nodes={nodes}
              structureMat={structureMat}
              kristallMat={kristallMat}
              textures={textures}
              weave={weave}
              fabricColor={fabricColor}
              fabricSliceX={fabricSliceX}
              fabricDropY={fabricDropY}
            />
          )
        }

        // ================= PANORAMIC GLASS SYSTEM =================
        if (sc.system === 'glass') {
          const span = glassSpan
          // ALWAYS AN EVEN NUMBER OF PANES: 2N (e.g. 4, 6, 8...)
          const N = Math.max(2, Math.round((span / 2) / 0.8))
          const count = 2 * N
          const doorW = span / count
          const xScale = doorW / glassSliceX

          // The two central French door leaves that meet at center line:
          const leftDoorIdx = N - 1
          const rightDoorIdx = N

          return (
            <group key={k} position={[g.center[0], 0, g.center[2]]} rotation={[0, sideRotY, 0]}>
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

              {/* Glass Panes with child aluminum perimeter frame */}
              {Array.from({ length: count }).map((_, i) => {
                const normalOff = -span / 2 + doorW / 2 + i * doorW

                if (sc.glassOpen === 'center') {
                  // Double Central French Doors (Leaves N-1 and N)
                  const isLeftDoor = i === leftDoorIdx
                  const isRightDoor = i === rightDoorIdx

                  if (isLeftDoor) {
                    // Left French door leaf: hinges at outer edge (-doorW / 2), swings outward
                    const openAngle = -sc.opening * (Math.PI * 0.52)
                    return (
                      <group key={i} position={[normalOff, 0, 0]}>
                        <group position={[-doorW / 2, 0, 0]} rotation={[0, openAngle, 0]}>
                          <Part
                            node={nodes.glass_pane}
                            anchor="bottomCenter"
                            position={[doorW / 2, 0.006, 0]}
                            scale={[xScale, glassYScale, 1]}
                            material={glassMat}
                            castShadow={false}
                            onChildMesh={setupGlassMesh}
                          />
                        </group>
                      </group>
                    )
                  } else if (isRightDoor) {
                    // Right French door leaf: hinges at outer edge (+doorW / 2), swings outward
                    const openAngle = sc.opening * (Math.PI * 0.52)
                    return (
                      <group key={i} position={[normalOff, 0, 0]}>
                        <group position={[doorW / 2, 0, 0]} rotation={[0, openAngle, 0]}>
                          <Part
                            node={nodes.glass_pane}
                            anchor="bottomCenter"
                            position={[-doorW / 2, 0.006, 0]}
                            scale={[xScale, glassYScale, 1]}
                            material={glassMat}
                            castShadow={false}
                            onChildMesh={setupGlassMesh}
                          />
                        </group>
                      </group>
                    )
                  } else {
                    // Stationary outer panoramic glass panels
                    return (
                      <group key={i} position={[normalOff, 0, 0]}>
                        <Part
                          node={nodes.glass_pane}
                          anchor="bottomCenter"
                          position={[0, 0.006, 0]}
                          scale={[xScale, glassYScale, 1]}
                          material={glassMat}
                          castShadow={false}
                          onChildMesh={setupGlassMesh}
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
                    <group key={i} position={[currentOff, 0, 0]} rotation={[0, openAng, 0]}>
                      <Part
                        node={nodes.glass_pane}
                        anchor="bottomCenter"
                        position={[0, 0.006, 0]}
                        scale={[xScale, glassYScale, 1]}
                        material={glassMat}
                        castShadow={false}
                        onChildMesh={setupGlassMesh}
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

  // Architectural fabric textures: Soltis 92 (dense microperforated) and Serge Ferrari (breathable light mesh)
  const textures = useTexture({
    soltisDiff: '/textures/fabrics/soltis-92-diffuse.webp',
    soltisNorm: '/textures/fabrics/soltis-92-normal.webp',
    ferrariDiff: '/textures/fabrics/serge-ferrari-diffuse.webp',
    ferrariNorm: '/textures/fabrics/serge-ferrari-normal.webp'
  })

  useMemo(() => {
    const configTex = (tex: THREE.Texture, isColor: boolean) => {
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping
      if (isColor) tex.colorSpace = THREE.SRGBColorSpace
    }
    configTex(textures.soltisDiff, true)
    configTex(textures.soltisNorm, false)
    configTex(textures.ferrariDiff, true)
    configTex(textures.ferrariNorm, false)
  }, [textures])

  // Dynamic PBR Materials for authentic architectural finishes
  const { structureMat, kristallMat, glassMat, ledBeamMat, ledColumnMat } = useMemo(() => {
    const sMat = new THREE.MeshStandardMaterial({
      color: cfg.colors.structure,
      roughness: cfg.colors.structureRoughness,
      metalness: cfg.colors.structureMetalness,
      envMapIntensity: 1.1,
      side: THREE.DoubleSide
    })

    // Crystal-clear Transparent PVC Kristall for external weather screens (zero refractive distortion)
    const kMat = new THREE.MeshPhysicalMaterial({
      color: '#f4f8fa',
      transmission: 0.90,
      opacity: 0.40,
      transparent: true,
      roughness: 0.01,
      metalness: 0.0,
      ior: 1.0, // Eliminate refractive ray distortion so background columns remain 100% straight and crisp
      thickness: 0.0,
      clearcoat: 1.0,
      clearcoatRoughness: 0.02,
      side: THREE.DoubleSide,
      depthWrite: false
    })

    const gMat = new THREE.MeshPhysicalMaterial({
      color: cfg.colors.glass || '#e6e6e6',
      transmission: cfg.colors.glassTransmission ?? 1.0,
      opacity: cfg.colors.glassOpacity ?? 0.95,
      transparent: true,
      roughness: 0,
      reflectivity: 1.0,
      ior: 1.43,
      thickness: 0.05,
      side: THREE.DoubleSide,
      depthWrite: false
    })

    const bLedOn = cfg.ledBeam
    const bLedMat = new THREE.MeshBasicMaterial({
      color: bLedOn ? '#fff0d0' : '#222222',
      toneMapped: false,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -4
    })

    const cLedOn = cfg.ledColumn
    const cLedMat = new THREE.MeshBasicMaterial({
      color: cLedOn ? '#ffeacc' : '#222222',
      toneMapped: false,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -4
    })

    return {
      structureMat: sMat,
      kristallMat: kMat,
      glassMat: gMat,
      ledBeamMat: bLedMat,
      ledColumnMat: cLedMat
    }
  }, [cfg.colors, cfg.ledBeam, cfg.ledColumn])

  return (
    <group>
      <WallMounting />
      <Columns nodes={nodes} mat={structureMat} ledMat={ledColumnMat} />
      <BeamsAndFrame nodes={nodes} structureMat={structureMat} ledMat={ledBeamMat} />
      <Louvers nodes={nodes} mat={structureMat} />
      <Sides
        nodes={nodes}
        structureMat={structureMat}
        kristallMat={kristallMat}
        glassMat={glassMat}
        textures={textures}
        weave={cfg.fabricWeave || 'soltis'}
        fabricColor={cfg.colors.fabric}
      />
    </group>
  )
}

export { NODE_NAMES }