import { useMemo } from 'react'
import * as THREE from 'three'
import { useConfigSelector } from '../lib/store'

/**
 * WallMounting renders realistic architectural plaster walls when the pergola
 * is configured as wall-mounted:
 * - 'wall1': 1 rear wall behind the pergola (z = -depth/2)
 * - 'wall2': 2 corner perpendicular walls (rear wall at z = -depth/2, left wall at x = -width/2)
 * - 'free': no walls (freestanding)
 */
export function WallMounting() {
  const mounting = useConfigSelector((s) => s.mounting)
  const width = useConfigSelector((s) => s.width)
  const depth = useConfigSelector((s) => s.depth)
  const H = useConfigSelector((s) => s.height)

  const wallMat = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#eaebee',
      roughness: 0.9,
      metalness: 0.02,
      side: THREE.DoubleSide
    })
  }, [])

  const trimMat = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#d5d8dc',
      roughness: 0.6,
      metalness: 0.1
    })
  }, [])

  if (mounting === 'free') return null

  const wallHeight = Math.max(3.5, H + 1.1)
  const wallThickness = 0.32
  const extraMargin = 1.2

  // Back Wall (Z = -depth/2)
  const backWallWidth = width + (mounting === 'wall2' ? extraMargin / 2 : extraMargin)
  const backWallX = mounting === 'wall2' ? extraMargin / 4 : 0
  const backWallZ = -depth / 2 - wallThickness / 2

  // Left Wall (X = -width/2) for wall2
  const leftWallDepth = depth + extraMargin / 2 + wallThickness
  const leftWallX = -width / 2 - wallThickness / 2
  const leftWallZ = -depth / 2 + (depth + extraMargin / 2 - wallThickness) / 2

  return (
    <group>
      {/* ================= REAR WALL (wall1 & wall2) ================= */}
      <group position={[backWallX, wallHeight / 2, backWallZ]}>
        {/* Main Wall Body */}
        <mesh castShadow receiveShadow material={wallMat}>
          <boxGeometry args={[backWallWidth, wallHeight, wallThickness]} />
        </mesh>

        {/* Top Architectural Coping Flashing */}
        <mesh
          position={[0, wallHeight / 2 + 0.02, 0]}
          castShadow
          receiveShadow
          material={trimMat}
        >
          <boxGeometry args={[backWallWidth + 0.04, 0.04, wallThickness + 0.04]} />
        </mesh>

        {/* Ground Base Skirting */}
        <mesh
          position={[0, -wallHeight / 2 + 0.04, wallThickness / 2 + 0.01]}
          castShadow
          receiveShadow
          material={trimMat}
        >
          <boxGeometry args={[backWallWidth, 0.08, 0.02]} />
        </mesh>
      </group>

      {/* ================= LEFT CORNER WALL (wall2 only) ================= */}
      {mounting === 'wall2' && (
        <group position={[leftWallX, wallHeight / 2, leftWallZ]}>
          {/* Main Corner Wall Body */}
          <mesh castShadow receiveShadow material={wallMat}>
            <boxGeometry args={[wallThickness, wallHeight, leftWallDepth]} />
          </mesh>

          {/* Top Architectural Coping Flashing */}
          <mesh
            position={[0, wallHeight / 2 + 0.02, 0]}
            castShadow
            receiveShadow
            material={trimMat}
          >
            <boxGeometry args={[wallThickness + 0.04, 0.04, leftWallDepth + 0.04]} />
          </mesh>

          {/* Ground Base Skirting */}
          <mesh
            position={[wallThickness / 2 + 0.01, -wallHeight / 2 + 0.04, 0]}
            castShadow
            receiveShadow
            material={trimMat}
          >
            <boxGeometry args={[0.02, 0.08, leftWallDepth]} />
          </mesh>
        </group>
      )}
    </group>
  )
}
