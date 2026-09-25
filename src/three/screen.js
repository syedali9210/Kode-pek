import { loadImage, drawCover, drawContain, hexA, wrapLines } from '../util.js'

// Everything the console's screen shows besides the procedural title scene is drawn here, into device.content.
const SW = 1024, SH = 716, M = 72

function base(c, p, dark = 0.9) {
  const g = c.createLinearGradient(0, 0, SW, SH)
  g.addColorStop(0, p.shell || '#10d23c'); g.addColorStop(1, p.ink || '#021')
  c.fillStyle = g; c.fillRect(0, 0, SW, SH)
  c.fillStyle = `rgba(4,8,10,${dark})`; c.fillRect(0, 0, SW, SH)
  // faint pixel grid
  c.strokeStyle = hexA(p.shell || '#10d23c', 0.12); c.lineWidth = 1
  c.beginPath()
  for (let x = 0; x < SW; x += 32) { c.moveTo(x, 0); c.lineTo(x, SH) }
  for (let y = 0; y < SH; y += 32) { c.moveTo(0, y); c.lineTo(SW, y) }
  c.stroke()
}
function px(c, text, x, y, size, color = '#ecffec', align = 'left') {
  c.font = `${size}px VT323`; c.textAlign = align; c.textBaseline = 'alphabetic'
  c.fillStyle = 'rgba(0,0,0,.5)'; c.fillText(text, x + size * 0.05, y + size * 0.05)
  c.fillStyle = color; c.fillText(text, x, y)
}
function fitDisplay(c, text, maxW, size) {
  let fs = size
  c.font = `${fs}px "Archivo Black"`
  while (c.measureText(text).width > maxW && fs > 30) { fs -= 4; c.font = `${fs}px "Archivo Black"` }
  return fs
}
function pips(c, n, total, x, y, color) {
  const w = Math.min(34, (SW - 2 * M) / total - 8)
  for (let i = 0; i < total; i++) {
    c.fillStyle = i <= n ? color : 'rgba(236,255,236,.18)'
    c.fillRect(x + i * (w + 8), y, w, 16)
  }
}

export function createScreen(device) {
  const c = device.content.getContext('2d')
  // gain: how hard bright pixels glow. Pixel-text cards glow; UI screenshots (mostly white) must not bloom out.
  const commit = (glitch = 0.5, gain = 0.9) => { device.contentTex.needsUpdate = true; device.screenMat.uniforms.uGain.value = gain; device.state.glitch = Math.max(device.state.glitch, glitch) }
  let token = 0 // bumps on every draw so late image loads don't overwrite a newer card

  function select(p, idx, total) {
    token++
    base(c, p, 0.72)
    px(c, 'SELECT CARTRIDGE', M, M + 30, 44, '#ecffec')
    px(c, `${String(idx + 1).padStart(2, '0')}/${String(total).padStart(2, '0')}`, SW - M, M + 30, 44, '#ecffec', 'right')
    const t = p.title.toUpperCase()
    const fs = fitDisplay(c, t, SW - 2 * M, 150)
    c.fillStyle = '#fff'; c.textAlign = 'left'
    c.fillText(t, M, 360)
    px(c, (p.subtitle || '').toUpperCase(), M, 420, 48, hexA('#ffffff', 0.85))
    px(c, p.comingSoon ? '> SEALED. COMING SOON' : '> INSERT TO PLAY', M, SH - M - 20, 52, p.comingSoon ? '#ffe600' : '#ecffec')
    commit(0.6)
  }

  function boot(p, k) {
    c.fillStyle = '#050807'; c.fillRect(0, 0, SW, SH)
    px(c, 'PLAYER ONE SYSTEM', SW / 2, 170, 46, hexA('#ecffec', 0.7), 'center')
    const t = p.title.toUpperCase()
    const fs = fitDisplay(c, t, SW - 2 * M, 140)
    c.fillStyle = p.shell; c.textAlign = 'center'; c.textBaseline = 'alphabetic'
    c.fillText(t, SW / 2, 360)
    px(c, 'LOADING CASE FILE' + '.'.repeat(1 + (Math.floor(k * 12) % 3)), SW / 2, 470, 44, '#ecffec', 'center')
    const bw = SW - 2 * M - 120, bx = (SW - bw) / 2
    c.strokeStyle = '#ecffec'; c.lineWidth = 4; c.strokeRect(bx, 510, bw, 44)
    const cells = 20, cw = (bw - 12) / cells
    for (let i = 0; i < Math.floor(k * cells); i++) { c.fillStyle = p.shell; c.fillRect(bx + 6 + i * cw, 516, cw - 4, 32) }
    commit(0)
  }

  function level(p, lv) {
    const my = ++token
    base(c, p, 0.8)
    const tag = lv.stage ? `STAGE ${lv.stage}` : lv.n === 0 ? 'TITLE' : `LVL ${String(lv.n).padStart(2, '0')}`
    px(c, tag, M, M + 30, 44, p.shell === '#2f62e6' ? '#9fc0ff' : '#ecffec')
    px(c, p.title.toUpperCase(), SW - M, M + 30, 44, hexA('#ecffec', 0.7), 'right')
    const draw = (im) => {
      if (my !== token) return
      if (im) {
        const ix = M, iy = M + 64, iw = SW - 2 * M, ih = SH - 2 * M - 150
        c.fillStyle = '#0b0f10'; c.fillRect(ix - 6, iy - 6, iw + 12, ih + 12)
        c.save(); c.beginPath(); c.rect(ix, iy, iw, ih); c.clip()
        c.fillStyle = '#f4f4f4'; c.fillRect(ix, iy, iw, ih)
        if (im.width / im.height > 3 || im.height / im.width > 1.3) drawContain(c, im, ix, iy, iw, ih)
        else drawCover(c, im, ix, iy, iw, ih, 0.5, 0.2)
        c.restore()
        px(c, lv.name.toUpperCase(), M, SH - M - 18, 50, '#ecffec')
      } else {
        const t = lv.name.toUpperCase()
        c.textBaseline = 'alphabetic'
        const words = t.split(' ')
        let fs = 118
        c.font = `${fs}px "Archivo Black"`
        let lines = wrapLines(c, t, SW - 2 * M)
        while ((lines.length > 2 || lines.some((l) => c.measureText(l).width > SW - 2 * M)) && fs > 50) { fs -= 6; c.font = `${fs}px "Archivo Black"`; lines = wrapLines(c, t, SW - 2 * M) }
        c.fillStyle = '#fff'; c.textAlign = 'left'
        lines.forEach((l, i) => c.fillText(l, M, 300 + i * fs * 0.95 - (lines.length - 1) * fs * 0.4))
        if (words.length) px(c, lv.kicker ? lv.kicker.toUpperCase() : '', M, 470, 44, hexA('#ecffec', 0.8))
      }
      pips(c, lv.i, lv.total, M, SH - M + 8, p.shell)
      commit(0.55, im ? 0 : 0.35)
    }
    if (lv.img) { draw(null); loadImage(lv.img).then(draw) } else draw(null)
  }

  function scores(p, lv) {
    token++
    base(c, p, 0.88)
    px(c, 'HIGH SCORES', SW / 2, M + 60, 84, '#ffe600', 'center')
    const rows = p.caseStudy.outcomes
    rows.forEach((r, i) => {
      const y = 250 + i * 92
      const color = ['#ffe600', '#ecffec', '#9fe8ff', '#ffb3c6'][i % 4]
      px(c, `${i + 1}${['ST', 'ND', 'RD', 'TH'][Math.min(i, 3)]}`, M, y, 48, color)
      c.font = '44px VT323'
      const label = r.label.toUpperCase()
      px(c, label.length > 26 ? label.slice(0, 25) + '…' : label, M + 110, y, 44, color)
      px(c, r.metric.replace('(Qualitative)', '').trim(), SW - M, y, 44, color, 'right')
    })
    pips(c, lv.i, lv.total, M, SH - M + 8, p.shell)
    commit(0.6, 0.35)
  }

  function complete(p) {
    token++
    base(c, p, 0.7)
    px(c, 'LEVEL', SW / 2, 250, 130, '#ffe600', 'center')
    px(c, 'COMPLETE!', SW / 2, 380, 130, '#ffe600', 'center')
    px(c, '★ ★ ★', SW / 2, 480, 80, '#fff', 'center')
    px(c, 'PRESS ⏏ FOR THE NEXT CARTRIDGE', SW / 2, SH - M, 40, '#ecffec', 'center')
    commit(0.8, 0.45)
  }

  function cont(n) {
    token++
    c.fillStyle = '#050807'; c.fillRect(0, 0, SW, SH)
    if (n >= 0) {
      px(c, 'CONTINUE?', SW / 2, 220, 120, '#ecffec', 'center')
      px(c, String(n), SW / 2, 470, 240, n <= 3 ? '#ff4a1c' : '#ffe600', 'center')
      px(c, 'PRESS ☺ TO SAY HI', SW / 2, SH - M, 44, hexA('#ecffec', 0.8), 'center')
    } else {
      px(c, 'GAME OVER', SW / 2, 300, 140, '#ff4a1c', 'center')
      px(c, 'THANKS FOR PLAYING ♥', SW / 2, 420, 60, '#ecffec', 'center')
      px(c, 'INSERT COIN TO CONTINUE', SW / 2, SH - M, 44, hexA('#ecffec', 0.7), 'center')
    }
    commit(n === 9 || n < 0 ? 0.6 : 0.15)
  }

  return { select, boot, level, scores, complete, cont }
}
