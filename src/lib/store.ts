import { create } from 'zustand'
import { useSyncExternalStore } from 'react'
import { defaultConfig, PergolaConfig, CameraPreset, SIDE_KEYS } from './types'

/**
 * Zustand store — ONE-WAY data flow:
 *   UI writes via set / reset / step navigation
 *   Scene reads via useConfigSelector (React hook) or getConfig (imperative)
 */

function encodeConfigToHash(cfg: PergolaConfig): string {
  try {
    const parts: string[] = []

    if (cfg.width !== defaultConfig.width) parts.push(`w=${cfg.width}`)
    if (cfg.depth !== defaultConfig.depth) parts.push(`d=${cfg.depth}`)
    if (cfg.height !== defaultConfig.height) parts.push(`h=${cfg.height}`)
    if (cfg.mounting !== defaultConfig.mounting) parts.push(`m=${cfg.mounting}`)
    if (cfg.louverAngle !== defaultConfig.louverAngle) parts.push(`la=${Math.round(cfg.louverAngle)}`)
    if (cfg.louverPacked) parts.push('lp=1')
    if (cfg.ledBeam) parts.push('lb=1')
    if (cfg.ledColumn) parts.push('lc=1')
    if (cfg.lightingMode !== defaultConfig.lightingMode) parts.push(`lm=${cfg.lightingMode}`)
    if (cfg.fabricWeave && cfg.fabricWeave !== 'soltis') parts.push(`fw=${cfg.fabricWeave}`)

    // Colors
    if (cfg.colors.structure !== defaultConfig.colors.structure) {
      parts.push(`cs=${cfg.colors.structure.replace('#', '')}`)
    }
    if (cfg.colors.fabric !== defaultConfig.colors.fabric) {
      parts.push(`cf=${cfg.colors.fabric.replace('#', '')}`)
    }
    if (cfg.colors.glass !== defaultConfig.colors.glass) {
      parts.push(`cg=${cfg.colors.glass.replace('#', '')}`)
    }

    // Sun
    if (cfg.sun.azimuth !== defaultConfig.sun.azimuth || cfg.sun.elevation !== defaultConfig.sun.elevation) {
      parts.push(`sun=${Math.round(cfg.sun.azimuth)},${Math.round(cfg.sun.elevation)}`)
    }

    // Sides
    SIDE_KEYS.forEach((k) => {
      const s = cfg.sides[k]
      if (s.system !== 'none') {
        const op1 = Math.round(s.opening * 100) / 100
        const op2 = Math.round((s.openingExternal ?? s.opening) * 100) / 100
        parts.push(`s${k}=${s.system}:${s.fabric}:${s.glassOpen}:${op1}:${op2}`)
      }
    })

    return parts.join('&')
  } catch {
    return ''
  }
}

function decodeConfigFromHash(): Partial<PergolaConfig> | null {
  try {
    const rawHash = window.location.hash.slice(1)
    if (!rawHash) return null

    // Legacy JSON format backwards-compatibility
    if (rawHash.startsWith('{') || rawHash.startsWith('%7B') || rawHash.includes('%22')) {
      const raw = JSON.parse(decodeURIComponent(rawHash))
      return {
        ...(raw.w ? { width: raw.w } : {}),
        ...(raw.d ? { depth: raw.d } : {}),
        ...(raw.m ? { mounting: raw.m } : {}),
        ...(raw.fs ? { fixedSides: raw.fs } : {}),
        ...(raw.la !== undefined ? { louverAngle: raw.la } : {}),
        ...(raw.lp !== undefined ? { louverPacked: !!raw.lp } : {}),
        ...(raw.s ? { sides: raw.s } : {}),
        ...(raw.led !== undefined ? { led: !!raw.led } : {}),
        ...(raw.ledB !== undefined ? { ledBeam: !!raw.ledB } : {}),
        ...(raw.ledC !== undefined ? { ledColumn: !!raw.ledC } : {}),
        ...(raw.lm ? { lightingMode: raw.lm } : {}),
        ...(raw.sun ? { sun: raw.sun } : {}),
        ...(raw.col ? { colors: raw.col } : {})
      }
    }

    // Compact Key-Value format
    const params = new URLSearchParams(rawHash)
    const patch: Partial<PergolaConfig> = {}

    const w = params.get('w')
    if (w) patch.width = parseFloat(w)
    const d = params.get('d')
    if (d) patch.depth = parseFloat(d)
    const h = params.get('h')
    if (h) patch.height = parseFloat(h)
    const m = params.get('m')
    if (m && ['free', 'wall1', 'wall2', 'wall_opposed'].includes(m)) patch.mounting = m as any
    const la = params.get('la')
    if (la) patch.louverAngle = parseFloat(la)
    const lp = params.get('lp')
    if (lp !== null) patch.louverPacked = lp === '1'
    const lb = params.get('lb')
    if (lb !== null) patch.ledBeam = lb === '1'
    const lc = params.get('lc')
    if (lc !== null) patch.ledColumn = lc === '1'
    const lm = params.get('lm')
    if (lm && ['studio', 'environment'].includes(lm)) patch.lightingMode = lm as any
    const fw = params.get('fw')
    if (fw && ['soltis', 'ferrari'].includes(fw)) patch.fabricWeave = fw as any

    const cs = params.get('cs')
    const cf = params.get('cf')
    const cg = params.get('cg')
    if (cs || cf || cg) {
      patch.colors = {
        ...defaultConfig.colors,
        ...(cs ? { structure: '#' + cs } : {}),
        ...(cf ? { fabric: '#' + cf } : {}),
        ...(cg ? { glass: '#' + cg } : {})
      }
    }

    const sunStr = params.get('sun')
    if (sunStr) {
      const [az, el] = sunStr.split(',').map(parseFloat)
      if (!isNaN(az) && !isNaN(el)) {
        patch.sun = { azimuth: az, elevation: el }
      }
    }

    // Sides
    const sidesPatch: Record<string, any> = {}
    let hasSide = false
    SIDE_KEYS.forEach((k) => {
      const sVal = params.get(`s${k}`)
      if (sVal) {
        hasSide = true
        const [sys, fab, gOpen, op1, op2] = sVal.split(':')
        sidesPatch[k] = {
          system: sys || 'none',
          fabric: fab || 'shade',
          glassOpen: gOpen || 'center',
          opening: op1 !== undefined ? parseFloat(op1) : 0,
          openingExternal: op2 !== undefined ? parseFloat(op2) : 0
        }
      }
    })
    if (hasSide) {
      patch.sides = { ...defaultConfig.sides, ...sidesPatch }
    }

    return patch
  } catch {
    return null
  }
}

function getInitialConfig(): PergolaConfig {
  const fromHash = typeof window !== 'undefined' ? decodeConfigFromHash() : null
  return fromHash ? { ...defaultConfig, ...fromHash } : defaultConfig
}

export const useConfig = create<PergolaConfig>(() => getInitialConfig())

// Camera preset event bus
type CameraListener = (preset: CameraPreset) => void
const cameraListeners = new Set<CameraListener>()
export const triggerCameraPreset = (preset: CameraPreset) => {
  cameraListeners.forEach((fn) => fn(preset))
}
export const onCameraPreset = (fn: CameraListener) => {
  cameraListeners.add(fn)
  return () => {
    cameraListeners.delete(fn)
  }
}

function merge<T extends object>(base: T, patch: Partial<T>): T {
  const out: Record<string, unknown> = { ...base } as Record<string, unknown>
  for (const key of Object.keys(patch)) {
    const value = (patch as Record<string, unknown>)[key]
    const current = (base as Record<string, unknown>)[key]
    if (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      current !== null &&
      typeof current === 'object'
    ) {
      out[key] = merge(current as object, value as object)
    } else {
      out[key] = value
    }
  }
  return out as T
}

let hashDebounce: number | undefined

export const set = (patch: Partial<PergolaConfig>): void => {
  const prev = useConfig.getState()
  const next = merge(prev, patch)

  // Reactive dusk/night LED logic:
  if (patch.sun && next.autoLed) {
    const elevation = patch.sun.elevation
    if (elevation !== undefined) {
      const isNight = elevation <= 18
      next.led = isNight
      next.ledBeam = isNight
      next.ledColumn = isNight
    }
  }

  // Keep master led in sync
  if (patch.ledBeam !== undefined || patch.ledColumn !== undefined) {
    next.led = !!(next.ledBeam || next.ledColumn)
  }

  // Reactive mounting side alignment:
  if (patch.mounting) {
    if (patch.mounting === 'free') {
      next.fixedSides = { L: false, R: false, F: false, B: false }
    } else if (patch.mounting === 'wall1') {
      next.fixedSides = { L: false, R: false, F: false, B: true }
    } else if (patch.mounting === 'wall2') {
      next.fixedSides = { L: true, R: false, F: false, B: true }
    }
  }

  useConfig.setState(next)

  // Update hash state debounced
  if (typeof window !== 'undefined') {
    clearTimeout(hashDebounce)
    hashDebounce = window.setTimeout(() => {
      const h = encodeConfigToHash(next)
      const newHash = h ? '#' + h : ''
      if (window.location.hash !== newHash) {
        const target = window.location.pathname + window.location.search + newHash
        window.history.replaceState(null, '', target)
      }
    }, 400)
  }
}

export const nextStep = (): void => {
  const s = useConfig.getState().activeStep
  if (s < 4) set({ activeStep: s + 1 })
}

export const prevStep = (): void => {
  const s = useConfig.getState().activeStep
  if (s > 0) set({ activeStep: s - 1 })
}

export const setStep = (step: number): void => {
  set({ activeStep: Math.max(0, Math.min(4, step)) })
}

export const reset = (): void => {
  useConfig.setState(defaultConfig)
  if (typeof window !== 'undefined') {
    const target = window.location.pathname + window.location.search
    window.history.replaceState(null, '', target)
  }
}

export const getConfig = (): PergolaConfig => useConfig.getState()

export function useConfigSelector<T>(selector: (s: PergolaConfig) => T): T {
  return useSyncExternalStore(useConfig.subscribe, () =>
    selector(useConfig.getState())
  )
}