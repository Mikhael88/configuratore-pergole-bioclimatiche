import * as THREE from 'three'

/**
 * Assembly helpers — normalize each GLB part to a canonical anchor.
 * The exported GLB carries each part at an arbitrary origin; these helpers
 * compute the part's LOCAL bounding box (geometry space, no node transform)
 * and return the anchor point so the assembly can re-anchor cleanly.
 */

export type Anchor = 'baseCenter' | 'center' | 'topCenter' | 'bottomCenter'

/** Local-space bounding box of a part's geometry (ignores the node transform). */
export function localBox(node: THREE.Object3D): THREE.Box3 {
  const mesh = node as THREE.Mesh
  if (mesh.isMesh && mesh.geometry) {
    if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox()
    return mesh.geometry.boundingBox!.clone()
  }
  const box = new THREE.Box3()
  mesh.updateWorldMatrix(true, true)
  box.setFromObject(mesh)
  return box
}

/** Canonical anchor point in local space for a part. */
export function anchorPoint(box: THREE.Box3, kind: Anchor): THREE.Vector3 {
  const c = box.getCenter(new THREE.Vector3())
  switch (kind) {
    case 'baseCenter':
    case 'bottomCenter':
      return new THREE.Vector3(c.x, box.min.y, c.z)
    case 'topCenter':
      return new THREE.Vector3(c.x, box.max.y, c.z)
    case 'center':
    default:
      return c
  }
}

/**
 * Normalized group: renders `node` re-anchored so its geometry's `anchor`
 * point sits at the group's origin (0,0,0). The assembly then positions this
 * group directly at the logical target — no per-part offset bookkeeping.
 */
export function rearplace(node: THREE.Object3D, kind: Anchor): THREE.Vector3 {
  const a = anchorPoint(localBox(node), kind)
  return new THREE.Vector3(-a.x, -a.y, -a.z)
}

/** Clamp helper (0..1 opening, deg angles) re-exported for scene math. */
export const clamp = THREE.MathUtils.clamp
export const deg = THREE.MathUtils.degToRad