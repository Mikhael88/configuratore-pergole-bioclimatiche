/**
 * PERGOLA CONFIGURATOR - DATA MODEL (single source of truth)
 * ------------------------------------------------------------------
 * COORDINATE CONVENTION:
 *   Y is UP. Units = METERS.
 *   X = width axis, Z = depth axis.
 *   Sides: L = -x, R = +x, F = +z, B = -z.
 *   Origin at the center of the footprint; ground plane = y 0.
 */

export type SideKey = 'L' | 'R' | 'F' | 'B'
export type SideSystem = 'panel1' | 'panel2' | 'glass' | 'none'
export type FabricKind = 'thermal' | 'shade' // thermal=oscurante isolante (inverno), shade=trasparente ombreggiante (estate)
export type GlassOpenMode = 'accordion' | 'center'
export type Mounting = 'free' | 'wall1' | 'wall2' | 'wall_opposed'
export type LightingMode = 'studio' | 'environment'
export type CameraPreset = 'isometric' | 'front' | 'side' | 'top' | 'interior'

export interface SideConfig {
  system: SideSystem
  fabric: FabricKind
  glassOpen: GlassOpenMode
  opening: number // 0..1 (discesa tenda interna / singola o apertura ante)
  openingExternal?: number // 0..1 (discesa tenda esterna trasparente Kristall)
}

export interface Colors {
  structure: string
  structureRoughness: number
  structureMetalness: number
  fabric: string
  glass: string
  glassTransmission: number
  glassOpacity: number
}

export interface PergolaConfig {
  width: number
  depth: number
  height: number
  mounting: Mounting
  fixedSides: Record<SideKey, boolean>
  louverAngle: number // 0..180 gradi
  louverPacked: boolean // true = ruotate a 90° e impacchettate su un lato
  sides: Record<SideKey, SideConfig>
  led: boolean
  ledBeam: boolean
  ledColumn: boolean
  autoLed: boolean
  lightingMode: LightingMode
  showDimensions: boolean
  activeStep: number // 0..4 wizard step
  sun: { azimuth: number; elevation: number }
  colors: Colors
  fabricWeave: FabricWeave
}

export type FabricWeave = 'soltis' | 'ferrari'

export interface StructureFinishPreset {
  id: string
  name: string
  hex: string
  metalness: number
  roughness: number
}

export interface FabricPreset {
  id: string
  name: string
  hex: string
}

export interface GlassPreset {
  id: string
  name: string
  hex: string
  transmission: number
  opacity: number
}

export const STRUCTURE_FINISHES: StructureFinishPreset[] = [
  { id: 'antracite', name: 'Antracite Opaco', hex: '#373e43', metalness: 0.08, roughness: 0.82 },
  { id: 'salvia', name: 'Verde Salvia Opaco', hex: '#778572', metalness: 0.06, roughness: 0.85 },
  { id: 'rosso', name: 'Rosso Fuoco Semi Lucido', hex: '#b92525', metalness: 0.18, roughness: 0.28 },
  { id: 'tortora', name: 'Tortora Caldo', hex: '#8e8275', metalness: 0.05, roughness: 0.78 },
  { id: 'bianco', name: 'Bianco Gesso', hex: '#eaeae5', metalness: 0.03, roughness: 0.80 }
]

export const FABRIC_PRESETS: FabricPreset[] = [
  { id: 'antracite', name: 'Antracite Opaco', hex: '#373e43' },
  { id: 'salvia', name: 'Verde Salvia Opaco', hex: '#778572' },
  { id: 'rosso', name: 'Rosso Fuoco Semi Lucido', hex: '#b92525' },
  { id: 'tortora', name: 'Tortora Caldo', hex: '#8e8275' },
  { id: 'bianco', name: 'Bianco Gesso', hex: '#eaeae5' }
]

export const GLASS_PRESETS: GlassPreset[] = [
  { id: 'chiaro', name: 'Cristallo Chiaro', hex: '#c8e2ec', transmission: 0.95, opacity: 0.3 },
  { id: 'extracharo', name: 'Extra-Chiaro Diamante', hex: '#e6f4f7', transmission: 0.98, opacity: 0.18 },
  { id: 'fume', name: 'Fumé Bronzo Satinato', hex: '#584f47', transmission: 0.72, opacity: 0.65 }
]

export const SIDE_KEYS: SideKey[] = ['L', 'R', 'F', 'B']

export const SIDE_LABEL: Record<SideKey, string> = {
  L: 'Sinistra',
  R: 'Destra',
  F: 'Fronte',
  B: 'Retro'
}

export const defaultSide = (): SideConfig => ({
  system: 'none',
  fabric: 'shade',
  glassOpen: 'center',
  opening: 0,
  openingExternal: 0
})

export const defaultConfig: PergolaConfig = {
  width: 4.0,
  depth: 4.0,
  height: 2.40,
  mounting: 'free',
  fixedSides: { L: false, R: false, F: false, B: false },
  louverAngle: 45,
  louverPacked: false,
  sides: {
    L: defaultSide(),
    R: defaultSide(),
    F: defaultSide(),
    B: defaultSide()
  },
  led: false,
  ledBeam: false,
  ledColumn: false,
  autoLed: true,
  lightingMode: 'studio',
  showDimensions: true,
  activeStep: 0,
  sun: { azimuth: 135, elevation: 48 },
  fabricWeave: 'soltis',
  colors: {
    structure: STRUCTURE_FINISHES[0].hex,
    structureRoughness: STRUCTURE_FINISHES[0].roughness,
    structureMetalness: STRUCTURE_FINISHES[0].metalness,
    fabric: FABRIC_PRESETS[0].hex,
    glass: GLASS_PRESETS[0].hex,
    glassTransmission: GLASS_PRESETS[0].transmission,
    glassOpacity: GLASS_PRESETS[0].opacity
  }
}