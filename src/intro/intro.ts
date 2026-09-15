/**
 * Intro flight (clouds → product) state module.
 *
 * REVERT SWITCH: set INTRO_ENABLED to false and the whole intro disappears —
 * camera spawns at the default isometric position, no clouds, no skip button,
 * no UI fade. Nothing else needs to be touched.
 */
import { create, StoreApi, UseBoundStore } from 'zustand'

export const INTRO_ENABLED = true

/** Intro flight duration in seconds. */
export const INTRO_DURATION = 2.5

export type IntroPhase = 'idle' | 'flying' | 'done'

interface IntroState {
  phase: IntroPhase
  progress: number
  cloudOpacity: number
  uiReveal: number
  start: () => void
  skip: () => void
  setProgress: (p: number) => void
}

/** Singleton store pinned on globalThis so Vite HMR / duplicate module
 *  resolution (e.g. `/src/intro/intro.ts` vs bundled specifier) can't create
 *  two divergent copies of the intro state. */
const GLOBAL_KEY = '__arquatiIntroStore__'
function getOrCreateStore(): UseBoundStore<StoreApi<IntroState>> {
  const g = globalThis as unknown as Record<string, unknown>
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = create<IntroState>((set, get) => ({
      phase: 'idle',
      progress: 0,
      cloudOpacity: 1,
      uiReveal: 0,
      start: () => {
        if (get().phase === 'idle') set({ phase: 'flying', progress: 0, cloudOpacity: 1, uiReveal: 0 })
      },
      skip: () => {
        set({ phase: 'done', progress: 1, cloudOpacity: 0, uiReveal: 1 })
        markIntroSeen()
      },
      setProgress: (p: number) => {
        const clamped = Math.min(1, Math.max(0, p))
        // Clouds: hold full while descending through deck, fade smoothly over final stretch
        const cloudOpacity = 1 - smoothstep(0.7, 1, clamped)
        // UI chrome reveals smoothly over the second half
        const uiReveal = smoothstep(0.4, 0.95, clamped)
        if (clamped >= 1) {
          set({ phase: 'done', progress: 1, cloudOpacity: 0, uiReveal: 1 })
          markIntroSeen()
        } else {
          set({ progress: clamped, cloudOpacity, uiReveal })
        }
      }
    }))
  }
  return g[GLOBAL_KEY] as UseBoundStore<StoreApi<IntroState>>
}

export const useIntro = getOrCreateStore()

/** First visit ever (per browser session) OR any refresh (soft/hard) re-plays
 *  the intro. Implemented with sessionStorage: a fresh tab counts as first
 *  visit; plain in-tab SPA navigation does not re-trigger. */
export function shouldPlayIntro(): boolean {
  if (!INTRO_ENABLED) return false
  if (typeof window === 'undefined') return false
  try {
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('intro') === '1' || urlParams.get('intro') === 'true' || window.location.hash.includes('intro')) {
      return true
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
    const isReload = nav?.type === 'reload'
    const seenThisSession = sessionStorage.getItem('arquati-intro-seen') === '1'
    return isReload || !seenThisSession
  } catch {
    return true
  }
}

export function markIntroSeen(): void {
  try {
    sessionStorage.setItem('arquati-intro-seen', '1')
  } catch {
    /* storage unavailable — intro replays next load, acceptable */
  }
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

/** Cinematic ease: smooth curve with graceful deceleration onto the product. */
export function diveEase(t: number): number {
  return smoothstep(0, 1, t)
}

/** Expose imperative access for non-React code (CameraController). */
export const getIntro = () => useIntro.getState()

// Debug probe: read the REAL app store state from the browser console
if (typeof window !== 'undefined') {
  ;(window as any).__introProbe = () => {
    const s = useIntro.getState()
    return { phase: s.phase, progress: s.progress, cloudOpacity: s.cloudOpacity, uiReveal: s.uiReveal }
  }
}
