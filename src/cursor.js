import { touch } from './util.js'

// Custom cursor (dot + trailing ring + label), magnetic buttons and tilting screenshots.
// Fine pointers only: on touch this is a no-op and the page keeps native behaviour.
const MAGNETIC = '.cta, .nav a, .sound, .brand, .scroll-cue, .copy, .back-link, .hud-btn'
const INTERACTIVE = 'a, button, [data-cursor], label, summary'

export function initCursor() {
  if (touch) return { set() {} }
  document.documentElement.classList.add('has-cursor')
  const root = document.createElement('div')
  root.className = 'cursor'
  root.setAttribute('aria-hidden', 'true')
  root.innerHTML = '<i class="cursor-ring"></i><i class="cursor-dot"></i><span class="cursor-label"></span>'
  document.body.append(root)
  const ring = root.querySelector('.cursor-ring'), dot = root.querySelector('.cursor-dot'), label = root.querySelector('.cursor-label')

  const p = { x: -100, y: -100, rx: -100, ry: -100, s: 1, down: false, dom: false, scene: false, text: '' }
  let mag = null, tilt = null

  addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return
    p.x = e.clientX; p.y = e.clientY
    if (!root.classList.contains('on')) { root.classList.add('on'); p.rx = p.x; p.ry = p.y }
    p.dom = !!e.target.closest?.(INTERACTIVE)

    // magnetic: the element leans toward the cursor, springs back on leave (CSS transition)
    const m = e.target.closest?.(MAGNETIC)
    if (m !== mag) { if (mag) mag.style.translate = ''; mag = m }
    if (m) {
      const r = m.getBoundingClientRect()
      m.style.translate = `${(p.x - (r.left + r.width / 2)) * 0.22}px ${(p.y - (r.top + r.height / 2)) * 0.3}px`
    }
    // screenshots tilt toward the cursor like a handheld screen
    const t = e.target.closest?.('.bezel')
    if (t !== tilt) { if (tilt) tilt.style.transform = ''; tilt = t }
    if (t) {
      const r = t.getBoundingClientRect()
      const x = (p.x - r.left) / r.width - 0.5, y = (p.y - r.top) / r.height - 0.5
      t.style.transform = `perspective(1000px) rotateX(${(-y * 5).toFixed(2)}deg) rotateY(${(x * 7).toFixed(2)}deg) translateY(-3px)`
    }
  }, { passive: true })
  addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse') p.down = true })
  addEventListener('pointerup', () => (p.down = false))
  document.addEventListener('mouseout', (e) => { if (!e.relatedTarget) root.classList.remove('on') })

  ;(function frame() {
    requestAnimationFrame(frame)
    p.rx += (p.x - p.rx) * 0.2
    p.ry += (p.y - p.ry) * 0.2
    const hover = p.dom || p.scene
    p.s += ((p.down ? 0.75 : hover ? 1.75 : 1) - p.s) * 0.2
    dot.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`
    ring.style.transform = `translate3d(${p.rx}px, ${p.ry}px, 0) scale(${p.s.toFixed(3)})`
    label.style.transform = `translate3d(${p.rx + 26}px, ${p.ry + 14}px, 0)`
    root.classList.toggle('hover', hover)
  })()

  // main.js reports what the 3D scene (or a DOM data-cursor) wants to say
  return {
    set(text, sceneHover, grab = false) {
      p.scene = sceneHover
      if (text !== p.text) { p.text = text; if (text) label.textContent = text }
      root.classList.toggle('labeled', !!text)
      root.classList.toggle('grab', grab)
    },
  }
}
