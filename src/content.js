// Everything personal lives here. Copy is ported verbatim from portfolio v2;
// short headings (sticker titles, level names) are new and safe to rewrite.

export const me = {
  name: 'Syed Ali',
  role: 'Product Designer',
  location: 'Bengaluru, India',
  tz: 'Asia/Kolkata',
  email: 'syedwali9286@gmail.com',
  phone: '+91 7765863700',
  links: [
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/syedali138/' },
    { label: 'GitHub', href: 'https://github.com/syedali9210' },
  ],
  tagline: 'The guy who designs things and brings them to life, cuz why not. Engineering taught me to do things the unconventional way.',
  flips: ['Product designer', 'The guy', 'Pixel perfectionist', "Can't work without cold coffee"],
}

// Stuck on the back of the console. Stickers with `entry` are camera stops in "Player one".
// u/v are back-view coords (u: left→right as you look at the back, v: bottom→top), in device units.
export const stickers = [
  {
    id: 'hello', kind: 'photo', src: '/me/avatar.jpg', caption: 'HELLO!', u: -0.38, v: 0.66, w: 0.78, rot: -0.1,
    entry: {
      kicker: 'Player 1 · Syed Ali',
      title: "Hi, I'm Syed.",
      body: [
        "Engineering student who somehow landed in design, lol. Product designer, UI/UX guy, design engineer, whatever you wanna call me, i'll answer to it.",
      ],
    },
  },
  {
    id: '2am', kind: 'moon', u: 0.52, v: 0.86, w: 0.6, rot: 0.16,
    entry: {
      kicker: '01 · Origin story',
      title: 'Nerd-sniped at 2am',
      body: ["It started when i saw some random app banner and just couldn't stop staring at it. Next thing i know i'm making shapes at 2am, fully nerd-sniped."],
    },
  },
  {
    id: 'engg', kind: 'engg', u: 0.36, v: 0.2, w: 0.92, rot: 0.07,
    entry: {
      kicker: '02 · Second year',
      title: "Design ain't just Figma",
      body: ["Second year hit and i realized design ain't just Figma or Canva, it's literally about fixing what's actually broken for people."],
    },
  },
  {
    id: 'basenine', kind: 'basenine', u: -0.42, v: -0.06, w: 0.66, rot: -0.07,
    entry: {
      kicker: 'Now · Feb 2026 — Present',
      title: 'Product Designer Intern @ BASENINE',
      body: [
        'Designed and developed end-to-end web experiences for client products including Kodex and Uniqkey.',
        'Translated high-fidelity Figma designs into pixel-perfect, responsive interfaces using React, Next.js, TypeScript, and Tailwind CSS.',
        'Collaborated with founders, product managers, designers, and engineers to take products from concept to production.',
      ],
      chips: ['React', 'Next.js', 'TypeScript', 'Tailwind CSS', 'Figma', 'GSAP', 'Framer Motion'],
    },
  },
  {
    id: 'pen', kind: 'pen', u: 0.46, v: -0.56, w: 0.74, rot: -0.16,
    entry: {
      kicker: '03 · The process',
      title: 'Pen & paper first',
      body: [
        'Now i just solve problems, build what i design, and yeah, pen and paper still kicks off almost everything.',
        'Honestly i just like taking an idea and actually shipping it, something people can use for real. Watching a random 2am thought turn into an actual product hits different, way more than it should.',
      ],
    },
  },
  {
    id: 'cafe', kind: 'photo', src: '/me/about-chill.jpg', caption: 'COLD COFFEE', u: -0.36, v: -0.82, w: 0.52, rot: 0.11,
    entry: {
      kicker: '04 · Off duty',
      title: 'Cold coffee on standby',
      body: [
        'Not designing? Probably animating something in a café, earphones in, cold coffee on standby.',
        "Certified cat guy. Every street cat near me knows they're getting head scratches, no debate.",
      ],
    },
  },
  // decoration only
  { id: 'cats', kind: 'photo', src: '/me/about-cats.jpg', caption: 'CAT GUY', u: 0.66, v: -1.04, w: 0.36, rot: -0.24 },
  { id: 'music', kind: 'photo', src: '/me/about-music.jpg', caption: 'ON REPEAT', u: -0.76, v: -0.46, w: 0.34, rot: 0.27 },
  { id: 'wild', kind: 'photo', src: '/me/about-wild.jpg', caption: 'IN THE WILD', u: 0.78, v: 0.46, w: 0.3, rot: -0.12 },
  { id: 'new', kind: 'burst', u: -0.8, v: 0.22, w: 0.34, rot: 0.3 },
  { id: 'code', kind: 'barcode', u: 0.02, v: -1.14, w: 0.56, rot: 0 },
]

export const projects = [
  {
    slug: 'kodex',
    title: 'Kodex',
    subtitle: 'Compliance, finally clear',
    meta: 'BASENINE, 2026',
    context: 'BASENINE',
    year: '2026',
    tag: 'Web Redesign',
    description:
      "Redesigned Kodex's marketing site so a mature B2B compliance platform finally feels as trustworthy and easy to evaluate as the product actually is.",
    cover: '/cases/kodex/kodex-screenshot.png',
    shell: '#8f6cf2',
    ink: '#241a52',
    palette: { dark: '#07031a', mid: '#8f6cf2', high: '#ece6ff' },
    caseStudy: {
      overview: [
        'Kodex is a B2B compliance platform that helps organizations integrate regulatory workflows into their existing systems.',
        'Redesigning the marketing website to better communicate the product, improve usability, and create a stronger enterprise-first experience.',
      ],
      challenge: [
        "The existing website didn't effectively communicate the value of the product. Technical information was difficult to digest, navigation lacked structure, and the overall experience didn't reflect the maturity of the platform.",
      ],
      researchTitle: 'Understanding the Existing Experience',
      researchIntro: ['After reviewing the existing website, I identified several areas that created friction for users.'],
      researchNotes: [
        { title: "Product messaging wasn't immediately clear." },
        { title: 'Important content lacked visual hierarchy.' },
        { title: 'Navigation made exploration feel difficult.' },
        { title: "Enterprise trust wasn't communicated effectively." },
        { title: 'Visual consistency varied across pages.' },
      ],
      insightsTitle: 'Design Goals',
      insightsIntro: [
        "After identifying the key pain points, I defined a few design goals that guided the entire redesign. The focus wasn't just on improving the UI, but on making the experience clearer, easier to navigate, and more aligned with how enterprise users explore and understand a product like Kodex.",
      ],
      insights: [
        { title: 'Product Clarity', description: 'Help visitors understand what Kodex does within the first few seconds.' },
        { title: 'Enterprise Trust', description: 'Create a premium visual language that reflects the maturity of the platform.' },
        { title: 'Simplify Navigation', description: 'Reduce friction and make important information easier to discover.' },
        { title: 'Drive Conversions', description: 'Design clear user journeys that naturally lead visitors toward booking a demo or exploring documentation.' },
      ],
      solutionsTitle: 'The Redesign',
      solutionsIntro: ['The redesign focused on solving the most critical pain points uncovered during research.'],
      solutions: [
        {
          label: 'Hero Experience',
          leftText: "The hero section didn't clearly communicate Kodex's value proposition.",
          rightTitle: 'Why this solution',
          rightText: 'Redesigned the hero with stronger messaging, supporting visuals, and clear primary actions to immediately explain the platform.',
          images: [{ src: '/cases/kodex/kx-hero-image.png', alt: 'Kodex hero redesign' }],
          impactTitle: 'Why it works',
          impactText: 'Visitors understand what Kodex does within seconds and know where to go next.',
        },
        {
          label: 'Information Architecture & Navigation',
          leftText: 'Users had difficulty discovering products, industries, and integrations due to an unstructured navigation system.',
          rightText: 'Reorganized the navigation around user intent and introduced a clearer information architecture.',
          images: [{ src: '/cases/kodex/kx-nav-frame2.png' }, { src: '/cases/kodex/kx-nav-frame1.png' }, { src: '/cases/kodex/kx-nav-image9.png' }],
          impactTitle: 'Why it works',
          impactText: 'Makes exploring the platform more intuitive while reducing decision fatigue.',
        },
        {
          label: 'Product Storytelling',
          leftText: 'Complex compliance workflows were difficult to understand through text-heavy sections.',
          rightText: 'Rebuilt product pages using modular layouts, visual storytelling, and clearer content hierarchy.',
          images: [{ src: '/cases/kodex/kx-story-image10.png' }, { src: '/cases/kodex/kx-story-image11.png' }],
          impactTitle: 'Why it works',
          impactText: "Transforms technical information into content that's easier to scan and understand.",
        },
        {
          label: 'Enterprise Trust',
          leftText: 'The website lacked visual elements that reinforced credibility and trust.',
          rightTitle: 'Why it works',
          rightText: 'Introduced stronger typography, consistent spacing, customer logos, supporting visuals, and enterprise-focused layouts.',
          images: [
            { src: '/cases/kodex/kx-trust-chart.png' },
            { src: '/cases/kodex/kx-trust-frame1.png' },
            { src: '/cases/kodex/kx-trust-frame3.png' },
            { src: '/cases/kodex/kx-trust-frame2.png' },
          ],
          impactTitle: 'Impact',
          impactText: 'Creates a more credible and professional experience for enterprise buyers.',
        },
      ],
      outcomesTitle: 'Outcomes',
      outcomesIntro: [
        "The redesign transformed Kodex's website into a clearer, more structured experience that better communicates the product while reinforcing trust with enterprise customers.",
      ],
      closingNote: ['Phew... that was a lot of compliance.', "Thanks for sticking around. Let's move on to something a little less regulated."],
      outcomes: [
        { label: 'Clearer Product Communication', metric: '↓ Learning Curve' },
        { label: 'Improved Navigation', metric: '3 → 1 Navigation Path' },
        { label: 'Stronger Enterprise Trust', metric: '↑ Brand Trust' },
        { label: 'Conversion-Focused Journey', metric: '↑ CTA Visibility' },
      ],
      learnedTitle: 'What I Learned',
      learned: [
        "Working on Kodex taught me that designing for B2B products goes beyond creating clean interfaces — it's about simplifying complex ideas and communicating them with clarity. I also learned how to balance stakeholder feedback, business goals, and technical constraints while building a scalable experience that feels intuitive, trustworthy, and ready to grow.",
      ],
    },
  },
  {
    slug: 'uniqkey',
    title: 'Uniqkey',
    subtitle: 'Breach risk you can feel',
    meta: 'BASENINE, 2026',
    context: 'BASENINE',
    year: '2026',
    tag: 'Web Design',
    description:
      'Designed a landing page that makes data breach risk feel real enough for businesses to actually act on, instead of more jargon to tune out.',
    cover: '/cases/uniqkey/uniqkey-screenshot.png',
    shell: '#2f62e6',
    ink: '#0d1f55',
    palette: { dark: '#01040f', mid: '#2f6bff', high: '#dbe9ff' },
    caseStudy: {
      overview: [
        'Uniqkey is a European password and access management platform that helps businesses secure employee credentials and manage access across their organization.',
        'Design a focused landing page that explains Data Breach Monitoring in a simple way, builds trust, and encourages businesses to assess their security posture.',
      ],
      challenge: [
        'Data breach monitoring is a technical topic that can easily overwhelm visitors. The challenge was to communicate the value of the feature in a way that felt approachable, trustworthy, and conversion-focused without sacrificing technical credibility.',
      ],
      researchTitle: 'Understanding the Existing Experience',
      researchIntro: [
        'I reviewed how information was presented and how users progressed through the page to identify opportunities for improving clarity and conversions.',
      ],
      researchNotes: [
        { title: 'Technical messaging felt overwhelming.' },
        { title: 'Important benefits lacked emphasis.' },
        { title: "Value proposition wasn't immediately obvious." },
        { title: 'The page needed a stronger narrative flow.' },
        { title: 'Calls-to-action could be more prominent.' },
      ],
      insightsTitle: 'Design Goals',
      insightsIntro: ['The redesign focused on balancing technical depth with simplicity while guiding visitors toward meaningful action.'],
      insights: [
        { title: 'Complex Security Concepts', description: 'Make cybersecurity easier for non-technical decision makers.' },
        { title: 'Enterprise Trust', description: 'Use visual hierarchy and credibility cues to reinforce confidence.' },
        { title: 'Improve Storytelling', description: 'Create a logical flow that gradually explains the problem and solution.' },
        { title: 'Drive Conversions', description: 'Design a clearer path toward trying the feature or booking a demo.' },
      ],
      solutionsTitle: 'The Redesign',
      solutionsIntro: ['The redesign focused on solving the most critical pain points uncovered during research.'],
      solutions: [
        {
          label: 'Hero Experience',
          leftText: "The hero didn't immediately explain why data breach monitoring matters.",
          rightTitle: 'Why this solution',
          rightText: 'Redesigned the hero around a stronger value proposition with supporting visuals and clear CTAs.',
          images: [{ src: '/cases/uniqkey/uk-hero-image.png', alt: 'Uniqkey hero redesign' }],
          impactTitle: 'Why it works',
          impactText: 'Visitors immediately understand the problem and how Uniqkey solves it.',
        },
        {
          label: 'Problem & Risk Communication',
          leftText: "The impact of a data breach wasn't clearly communicated.",
          rightText: 'Introduced structured content and visual storytelling to explain the risks and their business impact.',
          images: [{ src: '/cases/uniqkey/uk-risk-frame2.png' }, { src: '/cases/uniqkey/uk-risk-frame3.png' }, { src: '/cases/uniqkey/uk-risk-frame1.png' }],
          impactTitle: 'Why it works',
          impactText: 'Creates urgency without overwhelming users.',
        },
        {
          label: 'Feature Breakdown',
          leftText: 'Core features were buried within large blocks of content.',
          rightText: 'Redesigned feature sections using modular cards, icons, and concise explanations.',
          images: [
            { src: '/cases/uniqkey/uk-feature-frame4.png' },
            { src: '/cases/uniqkey/uk-feature-frame2.png' },
            { src: '/cases/uniqkey/uk-feature-frame1.png' },
            { src: '/cases/uniqkey/uk-feature-frame3.png' },
          ],
          impactTitle: 'Why it works',
          impactText: 'Makes capabilities easier to scan and compare.',
        },
        {
          label: 'Trust & Credibility',
          leftText: 'The page lacked enough proof to reassure enterprise buyers.',
          rightTitle: 'Why it works',
          rightText: 'Added stronger trust signals through testimonials, certifications, and supporting visuals.',
          images: [{ src: '/cases/uniqkey/uk-trust-image1.png' }, { src: '/cases/uniqkey/uk-trust-image2.png' }],
          impactTitle: 'Impact',
          impactText: 'Builds confidence before users reach the CTA.',
        },
      ],
      outcomesTitle: 'Outcomes',
      outcomesIntro: [
        'The redesign focused on creating a clearer, more structured experience that better communicates the product while making it easier for enterprise users to explore, understand, and take action.',
      ],
      closingNote: ['Phew... that was a lot of breach talk.', "Thanks for sticking around. Let's move on to something a little less alarming."],
      outcomes: [
        { label: 'Clearer Security Communication', metric: '↓ Complexity' },
        { label: 'Stronger Storytelling', metric: '1 Clear User Journey' },
        { label: 'Enterprise-ready Experience', metric: '↑ Brand Trust' },
        { label: 'Better Conversion Flow', metric: '↑ CTA Visibility' },
      ],
      learnedTitle: 'What I Learned',
      learned: [
        "Designing for cybersecurity taught me that users don't need every technical detail upfront — they need clarity, confidence, and a clear understanding of why the product matters. This project strengthened my ability to simplify complex topics while designing experiences that educate, build trust, and encourage action.",
      ],
    },
  },
  {
    slug: 'airtribe',
    title: 'Airtribe',
    subtitle: 'AI Learning Experience',
    meta: 'EduTech, 2026',
    context: 'EduTech',
    year: '2026',
    tag: 'Product Design',
    description: 'Designed an AI experience for the users to ease their learning experience through out the site.',
    cover: '/cases/airtribe/frame-7.png',
    shell: '#18b36b',
    ink: '#07351f',
    palette: { dark: '#010c04', mid: '#10d23c', high: '#dcffd4' },
    caseStudy: {
      overview: [
        "An AI-powered redesign of Airtribe's learning platform focused on helping learners navigate courses more confidently, reduce friction, and receive contextual AI assistance throughout their learning journey.",
        'Airtribe is a cohort-based edtech platform where professionals learn through live sessions, mentorship, assignments, and community-driven programs.',
      ],
      challenge: [
        'Although Airtribe offered quality learning content, the overall experience made it difficult for learners to understand where they were, what to do next, and how to make the most of the platform.',
        'My goal was to redesign the learning experience while exploring how AI could provide contextual assistance without overwhelming users.',
      ],
      researchTitle: 'Breaking Down the Problem',
      researchIntro: [
        'To dig deeper, I broke the problem down into four areas: how learners moved through their course journey, how they navigated the platform, how information was prioritized, and how engaged they felt along the way.',
        'Each area became its own lens for uncovering exactly where the friction was coming from.',
      ],
      researchNotes: [
        { title: 'Learning Journey', points: ['Users struggled to understand the overall course flow.', "Progress wasn't clearly communicated."] },
        { title: 'Navigation', points: ['Finding recordings, assignments, and resources required unnecessary effort.', 'Core sections felt disconnected.'] },
        { title: 'Information Hierarchy', points: ['Important actions competed for attention.', 'Users had difficulty identifying priorities.'] },
        { title: 'Engagement', points: ['The platform lacked proactive guidance.', 'Learners often had to search for information instead of receiving timely support.'] },
      ],
      findingsTitle: 'Research & Findings',
      findingsIntro: [
        "After reviewing the existing platform, studying the user journey, and comparing similar learning platforms, I found that most friction didn't come from the content itself — it came from how learners interacted with the platform.",
        "Users weren't looking for more features. They wanted a learning experience that felt structured, guided, and easy to navigate.",
        'The research highlighted four recurring themes that became the foundation of the redesign.',
      ],
      findings: [
        { title: 'Learning Flow', quotes: ['Not sure where to start.', 'The course journey feels confusing.', "I don't know what's coming next."] },
        { title: 'Navigation', quotes: ['Finding recordings takes too many clicks.', 'I keep jumping between different sections.', 'Assignments and resources feel disconnected.'] },
        { title: 'Info. Hierarchy', quotes: ['Everything feels the same.', 'Not sure what to do.', 'Easy to miss updates.'] },
        { title: 'AI', quotes: ['Need instant answers.', 'Resources are hard to find.', 'Need tailored recommendations.'] },
      ],
      insightsTitle: 'Insights',
      insightsIntro: [
        'The research uncovered recurring patterns in user behavior that revealed where learners experienced the most friction. These insights guided the redesign and shaped every feature that followed.',
      ],
      insights: [
        { title: 'Reduce cognitive load', description: "Learning should feel effortless. Surface only what's relevant instead of making learners process everything at once." },
        { title: "Guide, don't overwhelm", description: 'Instead of presenting every resource upfront, provide contextual guidance and clear next steps based on where the learner is in their journey.' },
        { title: 'Context beats search', description: "Learners shouldn't have to remember where information lives. Answers should appear within the context of the task they're already doing." },
        { title: 'AI should augment, not replace', description: 'AI is most valuable when it supports mentors and learners with summaries, recommendations, and guidance — not when it attempts to replace human teaching.' },
      ],
      solutionsTitle: 'Solutions',
      solutionsIntro: ['The redesign focused on solving the most critical pain points uncovered during research.'],
      solutions: [
        {
          label: 'AI Learning Companion',
          leftText: 'Learners spent too much time searching for answers across recordings, discussions, and resources.',
          rightTitle: 'Why this solution',
          rightText: 'Redesigned the hero around a stronger value proposition with supporting visuals and clear CTAs.',
          images: [{ src: '/cases/airtribe/cs-image-12.png', alt: 'AI learning companion' }],
          impactTitle: 'Impact',
          impactText: 'Faster access to information, reduced friction, and a more guided learning experience.',
        },
        {
          label: 'Redesigned Dashboard',
          leftText: "Users couldn't quickly understand their progress or what required attention.",
          rightText: 'Highlights priorities, upcoming sessions, and progress in a single, easy-to-scan view.',
          images: [
            { src: '/cases/airtribe/cs-screenshot-before.png', alt: 'Before' },
            { src: '/cases/airtribe/cs-image-5-after.png', alt: 'After' },
          ],
          impactTitle: 'Why it works',
          impactText: 'Learners can see exactly what needs attention at a glance, without digging through multiple screens.',
        },
        {
          label: 'Simplified Navigation',
          leftText: 'Finding recordings, assignments, and resources required unnecessary effort.',
          rightText: 'Users can reach core sections faster with a more predictable navigation experience.',
          images: [
            { src: '/cases/airtribe/cs-ai-curated-section.png', alt: 'AI curated section' },
            { src: '/cases/airtribe/cs-quick-notes.png', alt: 'Quick notes' },
            { src: '/cases/airtribe/cs-container.png', alt: 'Workspace container' },
            { src: '/cases/airtribe/cs-projects-mock.png', alt: 'Projects' },
          ],
        },
        {
          label: 'Improved Information Hierarchy',
          leftText: 'Important information competed equally for attention.',
          rightTitle: 'Why it works',
          rightText: 'Reorganized content using stronger hierarchy, spacing, and visual emphasis.',
          images: [{ src: '/cases/airtribe/cs-image-6.png' }, { src: '/cases/airtribe/cs-image-12.png' }, { src: '/cases/airtribe/cs-image-7.png' }],
          impactTitle: 'Impact',
          impactText: 'Users can identify priorities at a glance and make decisions more confidently.',
        },
      ],
      outcomesTitle: 'Outcomes',
      outcomesIntro: [
        'The redesign focused on creating a clearer and more guided learning experience by simplifying navigation, improving information hierarchy, and introducing contextual AI support.',
      ],
      closingNote: ["You've officially graduated from this case study.", 'Time to enroll in the next one.'],
      outcomes: [
        { label: 'Clear Learning Journey', metric: '↓ Cognitive Load (Qualitative)' },
        { label: 'Faster Navigation', metric: '3 → 1 Clicks' },
        { label: 'Contextual AI Support', metric: '24/7 Assistance' },
        { label: 'Better Information Hierarchy', metric: '↑ Task Visibility' },
      ],
      learnedTitle: 'What I Learned',
      learned: [
        "This project helped me think beyond just designing screens. I learned how small UX decisions can shape the entire learning experience and how AI should solve real user problems instead of being added just because it's trending.",
      ],
    },
  },
  {
    slug: 'khaata',
    title: 'Khaata',
    subtitle: 'Your finance, tracked.',
    meta: 'FinTech, 2026',
    context: 'FinTech',
    year: '2026',
    tag: 'FinTech',
    description: 'Your finance, tracked.',
    cover: '/cases/khaata/khaata-app.png',
    shell: '#f5b523',
    ink: '#4a3200',
    palette: { dark: '#0e0600', mid: '#ffb21c', high: '#fff5d4' },
    comingSoon: true,
  },
]

// The cartridge that lives in the console on the home page.
export const homeCart = {
  slug: 'home',
  title: 'Syed Ali',
  subtitle: 'Player one',
  meta: 'Bengaluru, 2026',
  tag: 'Portfolio',
  shell: '#f5664a',
  ink: '#5a1608',
}
