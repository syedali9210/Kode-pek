import { me, stickers, projects } from './content.js'
import SIZES from './image-sizes.js'

const esc = (s = '') => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
const pad = (n) => String(n).padStart(2, '0')
const paras = (arr = []) => arr.map((p) => `<p>${esc(p)}</p>`).join('')
export const playable = projects.filter((p) => !p.comingSoon)

// ---------------------------------------------------------------- home
// IA: who (hero) → work → who, briefly (about) → contact. `*word*` in copy renders in the display face's light weight.
const rich = (s = '') => esc(s).replace(/\*(.+?)\*/g, '<em>$1</em>')

export function homeHTML() {
  const entries = stickers.filter((s) => s.entry)
  return `
  <main id="home" class="home">
    <section class="hero" data-shot aria-labelledby="hero-title">
      <div class="hero-copy">
        <h1 id="hero-title" class="hero-title">
          <span class="meta">${esc(me.name)} <i>—</i> ${esc(me.role)}, Bengaluru</span>
          <span class="display" data-split>${me.statement.map((l) => `<span class="ln">${rich(l)}</span>`).join('')}</span>
        </h1>
        <p class="hero-line">${esc(me.heroLine)}</p>
      </div>
      <a class="scroll-cue" href="#work" data-scrollto=".works" data-cursor="Start"><span class="cue-line" aria-hidden="true"></span>Scroll to press start</a>
    </section>

    <div class="works-wrap" id="work">
      <header class="works-head">
        <p class="meta">Selected work</p>
        <h2 class="works-title">Select a <em>cartridge</em></h2>
      </header>
      <section class="turn" data-shot aria-hidden="true"></section>
      <section class="works" style="--n:${projects.length}" aria-label="Case studies">
        <div class="pin">
          <div class="cart-info">
            ${projects.map((p, i) => `
            <article class="ci${i === 0 ? ' active' : ''}" data-i="${i}" style="--c:${p.shell}">
              <p class="meta"><span class="swatch" aria-hidden="true"></span>${pad(i + 1)} <i>—</i> ${esc(p.tag)}</p>
              <h3 class="ci-name">${esc(p.title)}</h3>
              <p class="ci-tag">${esc(p.subtitle)}</p>
              <p class="meta dim">${esc(p.context)} · ${esc(p.year)}</p>
              ${p.comingSoon
                ? `<span class="cta sealed" data-sealed="${p.slug}" data-cursor="Sealed">Sealed · coming soon</span>`
                : `<div class="ci-row"><a class="cta" href="/work/${p.slug}" data-insert="${p.slug}" data-cursor="Insert">Insert cartridge<span class="cta-arrow" aria-hidden="true">→</span></a><span class="meta dim ci-hint">or drag it into the console</span></div>`}
            </article>`).join('')}
          </div>
        </div>
      </section>
      <div class="works-end" data-shot aria-hidden="true"></div>
    </div>

    <section class="about" id="about" aria-labelledby="about-title">
      <header class="sec-head">
        <p class="meta">About</p>
        <h2 id="about-title" class="sec-title">The guy behind <em>the console.</em></h2>
      </header>
      <ol class="entries">
        ${entries.map((s, i) => `
        <li class="entry" data-shot data-sticker="${s.id}">
          <p class="meta">${pad(i + 1)} / ${pad(entries.length)} <i>—</i> ${esc(s.entry.kicker)}</p>
          <h3>${rich(s.entry.title)}</h3>
          <p class="entry-body">${esc(s.entry.body)}</p>
          ${s.entry.tools ? `<p class="meta dim">${esc(s.entry.tools)}</p>` : ''}
        </li>`).join('')}
      </ol>
    </section>

    <footer class="contact" id="contact" data-shot aria-labelledby="contact-title">
      <div class="contact-copy">
        <p class="meta">Continue? <i>—</i> Insert coin</p>
        <h2 id="contact-title" class="contact-title" data-split>Let's have a <em>conversation</em> now.</h2>
        <div class="mail-row">
          <a class="mail" href="mailto:${me.email}" data-cursor="Say hi">${esc(me.email)}</a>
          <button class="copy" type="button" data-copy="${me.email}" data-cursor="Copy">Copy</button>
        </div>
        <ul class="socials">
          <li><a href="tel:${me.phone.replace(/\s/g, '')}">${esc(me.phone)}</a></li>
          ${me.links.map((l) => `<li><a href="${l.href}" target="_blank" rel="noopener noreferrer">${esc(l.label)} ↗</a></li>`).join('')}
        </ul>
        <p class="meta dim foot">© ${new Date().getFullYear()} ${esc(me.name)} <i>—</i> <span class="local-time">--:--</span> in Bengaluru</p>
      </div>
    </footer>
  </main>`
}

// ---------------------------------------------------------------- case study
// Built from the console's own materials: cream plastic panels, dark screen bezels,
// dusty-rose printed labels. Button colours only appear as small arcade-button dots and LEDs.
const DOTS = ['#2f62e6', '#f5b523', '#ec3f26', '#7b7ef0']
const dims = (src) => (SIZES[src] ? ` width="${SIZES[src][0]}" height="${SIZES[src][1]}"` : '')
const bezel = (src, alt, cls = '', lazy = true) =>
  `<button class="bezel${cls}" type="button" data-zoom="${src}" data-cursor="Zoom"><span class="glass"><img${lazy ? ' loading="lazy"' : ''} decoding="async"${dims(src)} src="${src}" alt="${esc(alt)}" /></span></button>`

export function caseHTML(p) {
  const cs = p.caseStudy
  const idx = projects.indexOf(p)
  const levels = 6 + (cs.findings ? 1 : 0) // brief, research, [findings], insights, solutions, outcomes, learned
  let n = 0
  const head = (name) => { n++; return `<header class="lvl-head"><p class="meta">${pad(n)} <i>/</i> ${pad(levels)}</p><h2 data-split>${esc(name)}</h2></header>` }
  const stop = (name, extra = '') => `class="level stop" data-name="${esc(name)}" data-n="${n + 1}" ${extra}`
  const prose = (arr = []) => `<div class="prose">${paras(arr)}</div>`
  const next = playable[(playable.indexOf(p) + 1) % playable.length]

  return `
  <main id="case" class="case" style="--c:${p.shell}">
    <header class="case-hero stop" data-name="${esc(p.title)}" data-n="0" data-img="${p.cover}">
      <a class="back-link meta" href="/#work" data-eject data-cursor="Eject">⏏ Eject cartridge</a>
      <p class="meta"><span class="swatch" aria-hidden="true"></span>Cartridge ${pad(idx + 1)} <i>—</i> now playing</p>
      <h1 data-split>${esc(p.title)}</h1>
      <p class="case-sub">${esc(p.subtitle)}</p>
      <p class="lede">${esc(p.description)}</p>
      <dl class="specs">
        <div><dt>Context</dt><dd>${esc(p.context)}</dd></div>
        <div><dt>Discipline</dt><dd>${esc(p.tag)}</dd></div>
        <div><dt>Year</dt><dd>${esc(p.year)}</dd></div>
        <div><dt>Role</dt><dd>${esc(me.role)}</dd></div>
      </dl>
    </header>

    <div class="case-body">
    <figure class="cover">${bezel(p.cover, `${p.title} — final design`, ' hero-shot', false)}</figure>

    <section ${stop('The brief')}>
      ${head('The brief')}
      ${prose(cs.overview)}
      <blockquote class="pull"><p class="meta">The challenge</p>${paras(cs.challenge.slice(0, 1))}</blockquote>
      ${cs.challenge.length > 1 ? prose(cs.challenge.slice(1)) : ''}
    </section>

    <section ${stop(cs.researchTitle)}>
      ${head(cs.researchTitle)}
      ${prose(cs.researchIntro)}
      <ol class="notes">
        ${cs.researchNotes.map((r, i) => `
        <li style="--d:${i}">
          <span class="note-n">${pad(i + 1)}</span>
          <div><p class="note-t">${esc(r.title)}</p>${r.points ? `<ul>${r.points.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}</div>
        </li>`).join('')}
      </ol>
    </section>

    ${cs.findings ? `
    <section ${stop(cs.findingsTitle)}>
      ${head(cs.findingsTitle)}
      ${prose(cs.findingsIntro)}
      <div class="quotes">
        ${cs.findings.map((f, i) => `
        <figure class="screen" style="--d:${i}">
          <div class="screen-in">
            <figcaption class="osd">CH ${pad(i + 1)} · ${esc(f.title)}</figcaption>
            ${f.quotes.map((q, j) => `<p class="line" style="--ch:${q.length + 2};--j:${j}">“${esc(q)}”</p>`).join('')}
          </div>
        </figure>`).join('')}
      </div>
    </section>` : ''}

    <section ${stop(cs.insightsTitle)}>
      ${head(cs.insightsTitle)}
      ${prose(cs.insightsIntro)}
      <div class="goals">
        ${cs.insights.map((x, i) => `
        <article class="panel goal" style="--d:${i}">
          <div class="goal-top"><span class="dot" style="--b:${DOTS[i % 4]}" aria-hidden="true"></span><span class="print">${pad(i + 1)}</span></div>
          <h3>${esc(x.title)}</h3>
          <p>${esc(x.description)}</p>
        </article>`).join('')}
      </div>
    </section>

    <section ${stop(cs.solutionsTitle)} data-img="${cs.solutions[0]?.images[0]?.src || ''}">
      ${head(cs.solutionsTitle)}
      ${prose(cs.solutionsIntro)}
      ${cs.solutions.map((s, j) => `
      <article class="stage stop" data-name="${esc(s.label)}" data-n="${n}" data-stage="${n}-${j + 1}" data-img="${s.images[0]?.src || ''}">
        <p class="meta">Stage ${n}-${j + 1}</p>
        <h3>${esc(s.label)}</h3>
        <div class="pf">
          <div><p class="pf-l"><i class="led red"></i>Problem</p><p>${esc(s.leftText)}</p></div>
          <div><p class="pf-l"><i class="led green"></i>${esc(s.rightTitle || 'Solution')}</p><p>${esc(s.rightText)}</p></div>
        </div>
        <div class="gallery g${Math.min(s.images.length, 4)}">
          ${s.images.map((im) => bezel(im.src, im.alt || s.label)).join('')}
        </div>
        ${s.impactText ? `<p class="impact"><i class="led yellow"></i><span><b>${esc(s.impactTitle || 'Impact')}</b> ${esc(s.impactText)}</span></p>` : ''}
      </article>`).join('')}
    </section>

    <section ${stop('High scores')} data-scores>
      ${head(cs.outcomesTitle)}
      ${prose(cs.outcomesIntro)}
      <figure class="screen scoreboard">
        <div class="screen-in">
          <figcaption class="osd">High scores</figcaption>
          <ol class="scores">
            ${cs.outcomes.map((o, i) => `<li style="--d:${i}"><span class="rank">${i + 1}${['st', 'nd', 'rd', 'th'][Math.min(i, 3)]}</span><span class="label">${esc(o.label)}</span><span class="metric">${esc(o.metric)}</span></li>`).join('')}
          </ol>
        </div>
      </figure>
    </section>

    <section ${stop(cs.learnedTitle)}>
      ${head(cs.learnedTitle)}
      <blockquote class="pull">${paras(cs.learned)}</blockquote>
    </section>

    <section class="level stop complete" data-name="Level complete" data-n="${n + 1}" data-complete>
      <p class="meta">All levels cleared</p>
      <h2 class="complete-title" data-split>Level <em>complete.</em></h2>
      <div class="prose">${paras(cs.closingNote)}</div>
      <a class="next-cart" href="/work/${next.slug}" data-next="${next.slug}" style="--c:${next.shell}" data-cursor="Insert">
        <span class="nc-label">
          <span class="print">Next cartridge</span>
          <b>${esc(next.title)}</b>
          <span class="nc-sub">${esc(next.subtitle)}</span>
        </span>
        <span class="nc-go" aria-hidden="true">Insert →</span>
        <span class="nc-grip" aria-hidden="true"></span>
      </a>
      <a class="cta" href="/#work" data-eject data-cursor="Eject">All cartridges<span class="cta-arrow" aria-hidden="true">→</span></a>
    </section>
    </div>
  </main>`
}
