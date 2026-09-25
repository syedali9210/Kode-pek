import { me, stickers, projects } from './content.js'

const esc = (s = '') => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
const pad = (n) => String(n).padStart(2, '0')
const paras = (arr = []) => arr.map((p) => `<p>${esc(p)}</p>`).join('')
export const playable = projects.filter((p) => !p.comingSoon)

// ---------------------------------------------------------------- home
export function homeHTML() {
  const entries = stickers.filter((s) => s.entry)
  return `
  <main id="home" class="home">
    <section class="hero" data-shot data-sec="Title screen" aria-labelledby="hero-title">
      <div class="hero-copy">
        <p class="kicker"><i class="led green"></i>${esc(me.role)} · ${esc(me.location)}</p>
        <h1 id="hero-title" class="hero-name">${esc(me.name)}</h1>
        <p class="hero-line">${esc(me.tagline)}</p>
        <p class="flip" aria-hidden="true">Currently: <span class="flip-word">${esc(me.flips[0])}</span></p>
        <div class="hero-cta">
          <a class="arcade-btn start" href="#about" data-cursor="Start"><span>▶ Press start</span></a>
          <a class="text-link" href="#contact" data-scrollto="#contact">Say hi →</a>
        </div>
      </div>
    </section>

    <section class="about" id="about" aria-label="About">
      <header class="sec-head">
        <p class="kicker">Player one</p>
        <h2 class="sec-title">The guy<br>behind the console</h2>
        <p class="sec-sub">Every sticker on the back has a story. Keep scrolling, the camera reads them out.</p>
      </header>
      <ol class="entries">
        ${entries.map((s, i) => `
        <li class="entry" data-shot data-sticker="${s.id}">
          <p class="kicker"><span class="sticker-n">${pad(i + 1)}/${pad(entries.length)}</span> ${esc(s.entry.kicker)}</p>
          <h3>${esc(s.entry.title)}</h3>
          ${s.entry.body.map((b) => `<p>${esc(b)}</p>`).join('')}
          ${s.entry.chips ? `<ul class="chips">${s.entry.chips.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>` : ''}
        </li>`).join('')}
      </ol>
    </section>

    <div class="works-wrap" id="work">
      <h2 class="works-title"><span class="kicker">Case studies</span>Select a<br>cartridge</h2>
      <section class="turn" data-shot aria-hidden="true"></section>
      <section class="works" style="--n:${projects.length}" aria-label="Case studies">
        <div class="pin">
          <div class="cart-info">
            ${projects.map((p, i) => `
            <article class="ci${i === 0 ? ' active' : ''}" data-i="${i}" style="--c:${p.shell}">
              <p class="kicker">Cartridge ${pad(i + 1)}/${pad(projects.length)} · ${esc(p.tag)}</p>
              <h3>${esc(p.title)}</h3>
              <p class="ci-sub">${esc(p.subtitle)} <span>· ${esc(p.meta)}</span></p>
              <p class="ci-desc">${esc(p.description)}</p>
              ${p.comingSoon
                ? `<button class="arcade-btn sealed" type="button" data-sealed="${p.slug}" data-cursor="Sealed">Sealed · coming soon</button>`
                : `<a class="arcade-btn" href="/work/${p.slug}" data-insert="${p.slug}" data-cursor="Insert"><span>Insert cartridge</span><kbd>↵</kbd></a>`}
            </article>`).join('')}
          </div>
          <nav class="cart-dots" aria-label="Jump to cartridge">
            ${projects.map((p, i) => `<button type="button" data-goto="${i}" style="--c:${p.shell}" aria-label="${esc(p.title)}"><span>${pad(i + 1)}</span></button>`).join('')}
          </nav>
          <div class="bar" aria-hidden="true"><i></i></div>
          <span class="keep" aria-hidden="true">Keep scrolling</span>
        </div>
      </section>
      <div class="works-end" data-shot aria-hidden="true"></div>
    </div>

    <footer class="contact" id="contact" data-shot aria-labelledby="contact-title">
      <div class="contact-copy">
        <p class="kicker">Continue? · Insert coin</p>
        <h2 id="contact-title">Let's have a<br>conversation now</h2>
        <div class="mail-row">
          <a class="mail" href="mailto:${me.email}" data-cursor="Say hi">${esc(me.email)}</a>
          <button class="copy" type="button" data-copy="${me.email}" data-cursor="Copy">Copy</button>
        </div>
        <ul class="socials">
          <li><a href="tel:${me.phone.replace(/\s/g, '')}">${esc(me.phone)}</a></li>
          ${me.links.map((l) => `<li><a href="${l.href}" target="_blank" rel="noopener noreferrer">${esc(l.label)} ↗</a></li>`).join('')}
        </ul>
        <small>© ${new Date().getFullYear()} ${esc(me.name)} · Designed & built with too much cold coffee.</small>
      </div>
    </footer>
  </main>`
}

// ---------------------------------------------------------------- case study
// Built from the console's own materials: cream plastic panels, dark screen bezels,
// dusty-rose printed labels. Button colours only appear as small arcade-button dots and LEDs.
const DOTS = ['#2f62e6', '#f5b523', '#ec3f26', '#7b7ef0']
const bezel = (src, alt, cls = '') => `<button class="bezel${cls}" type="button" data-zoom="${src}" data-cursor="Zoom"><span class="glass"><img loading="lazy" src="${src}" alt="${esc(alt)}" /></span></button>`

export function caseHTML(p) {
  const cs = p.caseStudy
  const idx = projects.indexOf(p)
  const levels = 5 + (cs.findings ? 1 : 0) + 2 // overview, challenge, research, [findings], insights, solutions, outcomes, learned
  let n = 0
  const head = (name) => { n++; return `<header class="lvl-head"><p class="print">Level ${pad(n)} <span>/ ${pad(levels)}</span></p><h2>${esc(name)}</h2></header>` }
  const stop = (name, extra = '') => `class="level stop" data-name="${esc(name)}" data-n="${n + 1}" ${extra}`
  const prose = (arr = []) => `<div class="prose">${paras(arr)}</div>`
  const next = playable[(playable.indexOf(p) + 1) % playable.length]

  return `
  <main id="case" class="case" style="--c:${p.shell}">
    <header class="case-hero stop" data-name="${esc(p.title)}" data-n="0" data-img="${p.cover}">
      <a class="eject-link" href="/#work" data-eject data-cursor="Eject"><i class="led yellow"></i>Eject cartridge</a>
      <p class="print"><i class="chip-swatch"></i>Cartridge ${pad(idx + 1)} · Now playing</p>
      <h1>${esc(p.title)}</h1>
      <p class="case-sub">${esc(p.subtitle)}</p>
      <p class="lede">${esc(p.description)}</p>
      <dl class="specs">
        <div><dt>Context</dt><dd>${esc(p.context)}</dd></div>
        <div><dt>Discipline</dt><dd>${esc(p.tag)}</dd></div>
        <div><dt>Year</dt><dd>${esc(p.year)}</dd></div>
        <div><dt>Role</dt><dd>${esc(me.role)}</dd></div>
      </dl>
      ${bezel(p.cover, `${p.title} — final design`, ' hero-shot')}
      <p class="hint"><span class="blink">▶</span> Scroll to play · <kbd>←</kbd> <kbd>→</kbd> skip levels</p>
    </header>

    <section ${stop('Overview')}>
      ${head('Overview')}
      ${prose(cs.overview)}
    </section>

    <section ${stop('The challenge')}>
      ${head('The challenge')}
      <div class="panel">
        <p class="panel-label"><i class="led red"></i>Problem to beat</p>
        ${paras(cs.challenge)}
      </div>
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
        <p class="print">Stage ${n}-${j + 1}</p>
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
      <div class="panel">
        <p class="panel-label"><i class="led green"></i>Save file · ${esc(p.title)}</p>
        ${paras(cs.learned)}
      </div>
    </section>

    <section class="level stop complete" data-name="Level complete" data-n="${n + 1}" data-complete>
      <p class="print">All levels cleared</p>
      <h2 class="complete-title">Level complete</h2>
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
      <a class="eject-link" href="/#work" data-eject data-cursor="Eject"><i class="led yellow"></i>Back to all cartridges</a>
    </section>
  </main>`
}
