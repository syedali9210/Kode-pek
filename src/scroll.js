import Lenis from 'lenis'
import { clamp, reduced } from './util.js'

// Shared scroll state read by the director every frame.
//   shot  — float index into the camera shots ([data-shot] markers crossing mid-screen), home only
//   works — 0..1 progress through the pinned cartridge track
//   stop  — index of the active case-study stop (level / stage)
// Element positions are cached in measure() (re-run on any body resize), so the per-frame update never touches layout.
export const scroll = { y: 0, vel: 0, shot: 0, works: 0, stop: 0, stops: [], worksEl: null, marks: [] }

let lenis = null
let stopTops = [], worksTop = 0, worksH = 0, vh = innerHeight
export function initScroll() {
  // one smooth-scroll instance for the whole site (it survives route changes); touch keeps native momentum
  lenis = reduced ? null : new Lenis({ autoRaf: false, lerp: 0.09, wheelMultiplier: 1, touchMultiplier: 1.2 })
  new ResizeObserver(() => measure()).observe(document.body)
}
export const rafScroll = (ms) => lenis?.raf(ms)

export function lock(on) {
  document.documentElement.classList.toggle('locked', on)
  on ? lenis?.stop() : lenis?.start()
}

export function scrollTo(y, { immediate = false, duration } = {}) {
  if (lenis) lenis.scrollTo(y, { immediate, duration, force: true, lock: false })
  else window.scrollTo(0, y)
}
export const elTop = (el) => el.getBoundingClientRect().top + window.scrollY

export function measure() {
  vh = innerHeight
  scroll.marks = [...document.querySelectorAll('[data-shot]')].map((el) => {
    const r = el.getBoundingClientRect()
    return r.top + scrollY + r.height / 2
  })
  scroll.worksEl = document.querySelector('.works')
  if (scroll.worksEl) { worksTop = elTop(scroll.worksEl); worksH = scroll.worksEl.offsetHeight }
  scroll.stops = [...document.querySelectorAll('.stop')]
  stopTops = scroll.stops.map(elTop)
  lenis?.resize()
  update()
}

// y of the works track for a cartridge index (so the carousel lands on it)
export function worksY(i, n) {
  if (!scroll.worksEl) return 0
  return worksTop + (worksH - vh) * (n > 1 ? i / (n - 1) : 0)
}

let prevY = 0
export function update() {
  const y = (scroll.y = window.scrollY)
  // px per frame, from the position itself: works for Lenis, native touch momentum and jumps alike, and settles to 0
  scroll.vel += (Math.max(-80, Math.min(80, y - prevY)) - scroll.vel) * 0.35
  prevY = y
  const m = scroll.marks
  if (m.length > 1) {
    const mid = y + vh / 2
    let i = 0
    while (i < m.length - 2 && mid > m[i + 1]) i++
    scroll.shot = i + clamp((mid - m[i]) / (m[i + 1] - m[i]))
  } else scroll.shot = 0
  if (scroll.worksEl) scroll.works = clamp((y - worksTop) / Math.max(1, worksH - vh))
  if (stopTops.length) {
    const line = y + vh * 0.55
    let a = 0
    for (let i = 0; i < stopTops.length; i++) if (stopTops[i] < line) a = i
    scroll.stop = a
  }
}
