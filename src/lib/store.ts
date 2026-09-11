import { create } from 'zustand'
import { useSyncExternalStore } from 'react'
import { defaultConfig, PergolaConfig, CameraPreset } from './types'

/**
 * Zustand store — ONE-WAY data flow:
 *   UI writes via set / reset / step navigation
 *   Scene reads via useConfigSelector (React hook) or getConfig (imperative)
 */

function encodeConfigToHash(cfg: PergolaConfig): string {
  try {
    const compact = {
      w: cfg.width,
      d: cfg.depth,
      m: cfg.mounting,
      fs: cfg.fixedSides,
      la: cfg.louverAngle,
      lp: cfg.louverPacked ? 1 : 0,
      s: cfg.sides,
      led: cfg.led ? 1 : 0,
      ledB: cfg.ledBeam ? 1 : 0,
      ledC: cfg.ledColumn ? 1 : 0,
      lm: cfg.lightingMode,
      sun: cfg.sun,
      col: cfg.colors
    }
    return '#' + encodeURIComponent(JSON.stringify(compact))
  } catch {
    return ''
  }
}

function decodeConfigFromHash(): Partial<PergolaConfig> | null {
  try {
    const hash = window.location.hash.slice(1)
    if (!hash) return null
    const raw = JSON.parse(decodeURIComponent(hash))
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
      if (window.location.hash !== h) {
        window.history.replaceState(null, '', h)
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
    window.history.replaceState(null, '', window.location.pathname)
  }
}

export const getConfig = (): PergolaConfig => useConfig.getState()

export function useConfigSelector<T>(selector: (s: PergolaConfig) => T): T {
  return useSyncExternalStore(useConfig.subscribe, () =>
    selector(useConfig.getState())
  )
}