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
export type Mounting = 'free' | 'wall1' | 'wall2'
export type LightingMode = 'studio' | 'environment'
export type CameraPreset = 'isometric' | 'front' | 'side' | 'top' | 'interior'

export interface SideConfig {
  system: SideSystem
  fabric: FabricKind
  glassOpen: GlassOpenMode
  opening: number // 0..1 (discesa tenda o apertura ante)
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
}

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
  { id: 'ral-7016', name: 'Antracite Sablé (RAL 7016)', hex: '#373e43', metalness: 0.15, roughness: 0.38 },
  { id: 'ral-9010', name: 'Bianco Puro (RAL 9010)', hex: '#f5f6f7', metalness: 0.05, roughness: 0.32 },
  { id: 'corten', name: 'Effetto Corten Rustico', hex: '#7c4328', metalness: 0.25, roughness: 0.58 },
  { id: 'bronzo', name: 'Bronzo Architetturale', hex: '#3d342d', metalness: 0.65, roughness: 0.35 },
  { id: 'ral-7021', name: 'Nero Grafite (RAL 7021)', hex: '#242729', metalness: 0.15, roughness: 0.34 },
  { id: 'anodizzato', name: 'Alluminio Anodizzato', hex: '#c5cad0', metalness: 0.85, roughness: 0.22 }
]

export const FABRIC_PRESETS: FabricPreset[] = [
  { id: 'taupe', name: 'Taupe Deserto (GDLM2)', hex: '#67574e' },
  { id: 'avorio', name: 'Avorio Naturale', hex: '#e8e2d4' },
  { id: 'antracite', name: 'Grigio Fumo Scuro', hex: '#2b2d2f' },
  { id: 'perla', name: 'Grigio Perla Chiaro', hex: '#c5c8c9' }
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
  opening: 0
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