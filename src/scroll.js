import Lenis from 'lenis'
import { clamp, reduced } from './util.js'

// Shared scroll state read by the director every frame.
//   shot  — float index into the camera shots ([data-shot] markers crossing mid-screen), home only
//   works — 0..1 progress through the pinned cartridge track
//   stop  — index of the active case-study stop (level / stage)
export const scroll = { y: 0, vel: 0, shot: 0, works: 0, stop: 0, stops: [], worksEl: null, marks: [] }

let lenis = null
export function initScroll() {
  lenis = reduced ? null : new Lenis({ autoRaf: false, lerp: 0.09, wheelMultiplier: 0.9 })
  lenis?.on('scroll', (l) => (scroll.vel = l.velocity))
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
  const marks = [...document.querySelectorAll('[data-shot]')]
  scroll.marks = marks.map((el) => {
    const r = el.getBoundingClientRect()
    return r.top + scrollY + r.height / 2
  })
  scroll.worksEl = document.querySelector('.works')
  scroll.stops = [...document.querySelectorAll('.stop')]
  lenis?.resize()
  update()
}

// y of the works track for a cartridge index (so the carousel lands on it)
export function worksY(i, n) {
  const el = scroll.worksEl
  if (!el) return 0
  return elTop(el) + (el.offsetHeight - innerHeight) * (n > 1 ? i / (n - 1) : 0)
}

export function update() {
  scroll.y = window.scrollY
  const m = scroll.marks
  if (m.length > 1) {
    const mid = scroll.y + innerHeight / 2
    let i = 0
    while (i < m.length - 2 && mid > m[i + 1]) i++
    scroll.shot = i + clamp((mid - m[i]) / (m[i + 1] - m[i]))
  } else scroll.shot = 0
  if (scroll.worksEl) {
    const r = scroll.worksEl.getBoundingClientRect()
    scroll.works = clamp(-r.top / Math.max(1, r.height - innerHeight))
  }
  if (scroll.stops.length) {
    const line = innerHeight * 0.55
    let a = 0
    scroll.stops.forEach((el, i) => { if (el.getBoundingClientRect().top < line) a = i })
    scroll.stop = a
  }
}
