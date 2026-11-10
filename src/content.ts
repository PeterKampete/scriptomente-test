// Page copy, taken from the desktop Figma frame (node 1:60).

export const navLinks = [
  { label: 'About', href: '#about' },
  { label: 'Experience', href: '#experience' },
  { label: 'Services', href: '#services' },
] as const

// Destinations are not defined in the design. Replace with the real URLs.
export const externalLinks = {
  instagram: '#',
  linkedin: '#',
  legalNotice: '#',
  privacyPolicy: '#',
}

export type Service = {
  number: string
  title: string
  description: string
  items: string[]
  /** Wording used by the tablet and mobile Figma frames, where it differs. */
  compact?: { description?: string; items?: string[] }
}

export const services: Service[] = [
  {
    number: '01',
    title: 'Brand & direction',
    description:
      'Find the thread that connects what you stand for, how you sound, and the people you want to reach.',
    items: ['Brand consulting', 'Brand voice & messaging', 'Workshop facilitation'],
  },
  {
    number: '02',
    title: 'Digital & content',
    description: 'Bring intention to how you show up, what you share, and where it belongs.',
    items: [
      'Digital & Social media strategy',
      'Content strategy & Channel audit',
      'Copywriting & content creation',
    ],
    compact: {
      items: ['Digital & social media strategy', 'Content strategy & channel audit', 'Copywriting & conversation'],
    },
  },
  {
    number: '03',
    title: 'Making it happen',
    description: 'Turn a direction into practical work, with someone who stays close to the details.',
    items: ['Website creation', 'Project management'],
    compact: {
      description: 'Turn direction into practical work, with someone to stay close to the details.',
      items: ['Ways to grow together', 'Project management'],
    },
  },
  {
    number: '04',
    title: 'Sales & growth',
    description: 'Turn attention into conversations, and conversations into customers.',
    items: ['Sales support', 'Marketing'],
    compact: {
      description: 'Turn attention into connection, and conversations into customers.',
    },
  },
]

export type Experience = {
  id: string
  title: string
  meta: string
  body: string
}

export const experiences: Experience[] = [
  {
    id: 'google',
    title: 'Google',
    meta: 'Dublin, 2025 - 2026',
    body: 'As Account Executive at Google I looked after a €XXXm portfolio of clients advertising in the German market and across Europe. I definitely had a favorite channel: YouTube, where paid campaigns and creators work side by side. I spent my days building pipelines and sitting across from C-level decision-makers, and the question I liked best was always where a budget wanted to go next, away from TV and Meta and toward video. On the side, I joined the Public Speaking Club.',
  },
  {
    id: 'monks',
    title: 'Monks',
    meta: 'Milan, 2022 - 2024',
    body: 'I started on BMW Austria and Switzerland, crafting brand and performance campaigns from the first brief to the final review, building processes from the ground up across several large organizations, and leading a team of three. Then came BMW Europe: as Business Director I was orchestrating 360° marketing across the region and 24 local markets on a €XXm+ annual budget, bringing in AI and content production automation, and keeping everyone aligned, from the board of directors to the local teams.',
  },
  {
    id: 'ogilvy',
    title: 'Ogilvy Social.Lab',
    meta: 'Berlin, 2021 - 2022',
    body: 'As an account manager, I was the main link between team and client for Lidl International, Henkel Beauty and Deutsche Bahn, running TV and social campaigns, large-scale moving image productions, and a bit of business development, ensuring that the work always landed on time and on budget.',
  },
  {
    id: 'tlgg',
    title: 'TLGG Agency',
    meta: 'Berlin, 2019 - 2021',
    body: 'As project manager, I managed social and moving-image productions from strategy to post-production for Starbucks At Home, Mercedes-AMG and Pfizer, alongside influencer campaigns and digital media: planning resources, negotiating costs, and coordinating the partners who make a shoot happen.',
  },
  {
    id: 'ibm',
    title: 'International Business Management',
    meta: 'Netherlands, 2016 - 2020',
    body: 'Studying in the Netherlands opened the door to my international life: a BBA in International Business Management, a specialization in Business Development for the MENA region, Cultural Awareness classes. It shaped me, personally and professionally.',
  },
  {
    id: 'doha',
    title: 'International Strategy & Business Plan',
    meta: 'Doha, 2017 - 2018',
    body: 'A semester in Doha on the FB Oranjewoud scholarship, studying International Strategy Management and Business Plan Development.',
  },
]

// Options for the contact form topic select. The design only shows the
// placeholder, so these mirror the services offered on the page.
export const contactTopics = [
  'Brand & direction',
  'Digital & content',
  'Making it happen',
  'Sales & growth',
  'Career & life transition coaching',
  'Something else',
]

/**
 * Memory cards for the coaching sequence. Facts come from the page itself.
 * Add a real photo by setting `image` (e.g. '/memories/google.jpg' in
 * /public); until then each card renders as a styled "postcard".
 */
export type Memory = { title: string; meta: string; image?: string }

export const careerMemories: Memory[] = [
  { title: 'Google', meta: 'Dublin · 2025 – 2026' },
  { title: 'BMW Europe', meta: 'Monks · Milan · 2022 – 2024' },
  { title: 'Ogilvy Social.Lab', meta: 'Berlin · 2021 – 2022' },
  { title: 'TLGG Agency', meta: 'Berlin · 2019 – 2021' },
  { title: 'Public Speaking Club', meta: 'Dublin' },
  { title: 'Business Management', meta: 'Netherlands · 2016 – 2020' },
]

export const transitionMemories: Memory[] = [
  { title: 'Dublin', meta: '2025 – 2026' },
  { title: 'Milan', meta: '2022 – 2024' },
  { title: 'Berlin', meta: '2019 – 2022' },
  { title: 'Doha', meta: '2017 – 2018' },
  { title: 'The Netherlands', meta: '2016 – 2020' },
  { title: 'Starting over, again', meta: 'Ten moves in ten years' },
]

/** Second image shown on the right while the headline reads "Life Transition".
 *  Leave undefined to use an alternate crop of the portrait. */
export const coachingAlternateImage: string | undefined = undefined
