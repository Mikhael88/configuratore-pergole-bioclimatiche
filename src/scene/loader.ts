/**
 * GLB loader stub for the white-label pergola library.
 *
 * The real rich asset ('/models/pergola-lib.glb') is added in a LATER phase.
 * This module exports:
 *   - loadLib(): async, returns the GLTF (GLTF & ObjectMap) or null if the
 *     file is not available yet — it must NEVER crash the app on a missing
 *     asset.
 *   - NODE_NAMES: the canonical node list the future assembly step will
 *     reference from the loaded scene graph.
 *
 * Draco decoding is enabled and served from '/draco/' (local copy of the
 * three.js decoder — no network). Set decoder path here so any consumer gets
 * it for free.
 */
import { useGLTF } from '@react-three/drei'
import type { GLTF } from 'three-stdlib'
import type { ObjectMap } from '@react-three/fiber'

/** Draco decoder served locally (offline). Overrides drei's gstatic default. */
const DRACO_PATH = '/draco/'

/** Server path of the (future) pergola library asset. */
export const LIB_URL = '/models/pergola-lib.glb'

/** Canonical node names the future assembly phase will look up in the GLB. */
export const NODE_NAMES: string[] = [
  'col_single',
  'col_double',
  'col_led',
  'beam_x',
  'beam_x_led',
  'beam_z',
  'beam_z_led',
  'panel_thermal_housing',
  'panel_thermal_fabric',
  'panel_shade_housing',
  'panel_shade_fabric',
  'glass_pane',
  'glass_frame',
  'glass_track',
  'slat',
  'slat_hinge_fixed',
  'slat_hinge_movable',
  'corner_node'
]

export type LibGLTF = GLTF & ObjectMap

/**
 * Load the pergola library GLB. Returns null (never throws) if the asset is
 * missing or the fetch fails. Must be invoked inside a <Canvas> (drei's
 * useGLTF requires the fiber context to build the ObjectMap).
 */
export async function loadLib(): Promise<LibGLTF | null> {
  // Enable local Draco decoding.
  useGLTF.setDecoderPath(DRACO_PATH)

  // Probe the asset first so a missing file degrades to null, not a crash.
  let head: Response
  try {
    head = await fetch(LIB_URL, { method: 'HEAD' })
  } catch {
    return null
  }
  if (!head.ok) return null

  try {
    // useDraco uses the draco decoder (default path now set to /draco/).
    return useGLTF(LIB_URL, DRACO_PATH) as LibGLTF
  } catch {
    return null
  }
}