export interface JobPosting {
  slug: string;
  title: string;
  department: string;
  location: string;
  type: string;
  salary: string;
  posted: string;
  excerpt: string;
  paragraphs: string[];
  responsibilities: string[];
  requirements: string[];
  niceToHave?: string;
}

export const JOBS: JobPosting[] = [
  {
    slug: 'chief-disruption-officer',
    title: 'Chief Disruption Officer',
    department: 'Corporate',
    location: 'Remote (disruption-friendly timezones)',
    type: 'Full-time',
    salary: 'Equity and exposure to disruption',
    posted: '2026-09-28',
    excerpt:
      'We need a visionary who can say the word "platform" forty times per keynote without blinking.',
    paragraphs: [
      'Zero Health is disrupting healthcare, and healthcare refuses to disrupt itself, so the burden falls on us. As Chief Disruption Officer you will own our disruption roadmap, our disruption OKRs, and the word "disruption", which we have trademarked.',
      'You will work closely with the CEO, who is also the CTO, who is also the Chief Visionary, and who reports to the board, which is the CEO. This is a highly collaborative role.',
    ],
    responsibilities: [
      'Disrupt, continuously and visibly',
      'Convert ordinary product updates into multi-part LinkedIn post series',
      'Maintain our disruption velocity dashboard',
      'Attend standups that could have been disruptions',
    ],
    requirements: [
      '12+ years of experience disrupting, ideally in an industry you do not understand',
      'A personal brand that includes the word "visionary" in the bio',
      'Demonstrated ability to pivot before breakfast',
      'Must be comfortable with the phrase "we are the Uber of healthcare"',
    ],
    niceToHave: 'A TEDx talk about synergy.',
  },
  {
    slug: 'growth-hacker-patient-acquisition',
    title: 'Senior Growth Hacker (Patient Acquisition)',
    department: 'Growth',
    location: 'Remote',
    type: 'Full-time',
    salary: 'Competitive, paid in wellness points (redeemable for wellness)',
    posted: '2026-10-02',
    excerpt:
      'Own the full funnel from first sneeze to subscription. KPIs are non-negotiable and so is the funnel.',
    paragraphs: [
      'Our growth team treats every symptom as a top-of-funnel event. A sore throat is not a medical incident, it is an activation opportunity. You will own the journey from "my throat hurts" to "I have purchased Zero Health Premium, Zero Health Premium Plus, and the family wellness bundle".',
      'The ideal candidate is allergic to plateau and mildly indifferent to the concept of churn, which we have rebranded as "graduation".',
    ],
    responsibilities: [
      'Grow monthly active patients by 15% month over month, forever, exponentially',
      'A/B test the color of every button, including the ones in the waiting room',
      'Convert 110% of the addressable population',
      'Report weekly on the funnel, the mega-funnel, and the funnel of funnels',
    ],
    requirements: [
      '5+ years of growth experience at a company whose product you can no longer explain',
      'Fluency in metrics that only you can see',
      'Experience with cohort analysis, hockey sticks, and explaining both to investors',
      'Emotional distance from features that users actually request',
    ],
    niceToHave: 'Has never once used the product.',
  },
  {
    slug: 'wellness-synergist',
    title: 'Wellness Synergist',
    department: 'People Operations',
    location: 'On-site (our wellness yurt)',
    type: 'Full-time',
    salary: 'Gratitude, plus a monthly aura stipend',
    posted: '2026-10-06',
    excerpt:
      'Keep our team aligned, hydrated, and synergized. The yurt is non-negotiable and so is the gong.',
    paragraphs: [
      'At Zero Health, we believe a healthy company culture starts with a healthy company, which is why we measure employee morale hourly using a proprietary blend of surveys and vibes. As Wellness Synergist, you will orchestrate our wellness calendar, lead our Monday intention-setting gong ceremony, and ensure no meeting ends without at least one affirmation.',
      'You will also own our annual offsite, held last year at a retreat center whose wifi policy we are still legally discussing.',
    ],
    responsibilities: [
      'Ring the gong at 09:00, 12:00, and 15:00 (sharp)',
      'Facilitate trust falls, both literal and organizational',
      'Curate the yurt (cushions, crystals, optional oxygen)',
      'Convert burnout into "sustainable passion" on performance reviews',
    ],
    requirements: [
      'Certified in at least four frameworks with trademarked names',
      'Can pronounce "psychological safety" with a straight face in a reorg meeting',
      'Believes the team that breathes together succeeds together',
      'Yurt experience strongly preferred',
    ],
    niceToHave: 'Own gong.',
  },
  {
    slug: 'compliance-theater-lead',
    title: 'Compliance Theater Lead',
    department: 'Legal & Trust',
    location: 'Hybrid',
    type: 'Full-time',
    salary: 'Market rate, plus a very robust binder',
    posted: '2026-10-10',
    excerpt:
      'Own our award-winning security questionnaire pipeline. The awards were also internal.',
    paragraphs: [
      'Every serious health platform answers security questionnaires, and Zero Health answers them faster and more confidently than anyone in the industry. As Compliance Theater Lead, you will own our library of 1,400 pre-approved answers, our trust center, and our patented questionnaire autofill pipeline.',
      'This is a highly visible role. Investors, enterprise buyers, and our own marketing team will rely on your words, ideally the same words every time, in a reassuring font.',
    ],
    responsibilities: [
      'Answer every security questionnaire within 24 hours, regardless of accuracy',
      'Maintain the trust portal, its badges, and its badge-adjacent graphics',
      'Coordinate the annual audit, which we always pass, by scheduling it',
      'Draft blog posts with the word "bank-grade" in them',
    ],
    requirements: [
      'Expert-level familiarity with the phrase "we take security seriously"',
      'Can produce a 90-page SOC 2 narrative from three bullet points and a logo',
      'Comfortable with the sentence "that finding is a known industry best practice"',
      'Never uses the word "no" in writing',
    ],
    niceToHave: 'A laminated copy of ISO 27001 for the wall.',
  },
  {
    slug: 'prompt-whisperer',
    title: 'Prompt Whisperer, Zero Agent Team',
    department: 'AI',
    location: 'Remote',
    type: 'Full-time',
    salary: 'Very competitive (negotiable in tokens)',
    posted: '2026-10-14',
    excerpt:
      'Speak fluent model. Shape the personality of an assistant that talks to millions of patients, presumably well.',
    paragraphs: [
      'Zero Agent is the empathetic heart of the Zero Health platform, and behind every great assistant is a great prompt, and behind every great prompt is you, at 2 a.m., tweaking the word "kindly". As Prompt Whisperer, you will craft the instructions that define Zero Agent\'s tone, boundaries, and favorite icebreakers.',
      'You will work with cutting-edge tooling, including a text box and your instincts.',
    ],
    responsibilities: [
      'Maintain the master prompt document (v471 and counting)',
      'A/B test whether the agent is "delighted" to help or merely "happy" to',
      'Ensure the assistant never, ever suggests drinking water before consulting a growth funnel',
      'Lead prompt standups, prompt retros, and the quarterly prompt offsite',
    ],
    requirements: [
      '3+ years of experience writing instructions that a large language model mostly follows',
      'A sixth sense for when a model is about to hallucinate a citation',
      'Strong opinions on the serial comma, weakly held, loudly expressed',
      'Portfolio of prompts, redacted for reasons you will understand',
    ],
    niceToHave: 'Has apologized to a chatbot and meant it.',
  },
  {
    slug: 'telehealth-ux-intern',
    title: 'Telemedicine UX Intern (Unpaid)',
    department: 'Design',
    location: 'Remote',
    type: 'Internship, 6 months',
    salary: 'Course credit and unlimited gratitude',
    posted: '2026-10-18',
    excerpt:
      'Redesign the future of healthcare for academic credit. Bring your own laptop and insurance.',
    paragraphs: [
      'We are looking for a passionate design student to own the end-to-end experience of our video consultation flow, our symptom checker, our prescription renewal journey, our patient onboarding wizard, and our accessibility remediation backlog, starting Monday.',
      'This is a learning opportunity. You will learn a lot. That is the compensation.',
    ],
    responsibilities: [
      'Ship pixel-perfect designs for 14 concurrent feature squads',
      'Run usability testing with participants recruited from your own family',
      'Own the design system, the icon library, and the font licenses (please source the fonts)',
      'Document everything in Figma, in Notion, and in a shared doc of unclear ownership',
    ],
    requirements: [
      'Currently enrolled in a program we can list in our university partnerships slide',
      'Mastery of Figma, FigJam, and saying yes',
      'Available full-time, nights optional, passion mandatory',
      'Owns a laptop (see: equipment policy, forthcoming)',
    ],
    niceToHave: 'A degree in something we can call "human-centered".',
  },
];
