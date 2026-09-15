/**
 * IntroOverlay — DOM chrome for the intro: a small "Salta intro" button and a
 * soft brand veil. Disappears (pointer-events off) as soon as the flight ends.
 */
import { useIntro } from './intro'

export function IntroOverlay() {
  const phase = useIntro((s) => s.phase)
  const skip = useIntro((s) => s.skip)

  if (phase === 'done' || phase === 'idle') return null

  return (
    <button className="intro-skip-btn" onClick={skip} aria-label="Salta introduzione">
      Salta intro
      <span className="intro-skip-arrow">→</span>
    </button>
  )
}
