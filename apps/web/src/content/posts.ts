export interface PostBlock {
  heading?: string;
  paragraphs: string[];
}

export interface Post {
  slug: string;
  title: string;
  tag: string;
  date: string;
  readTime: string;
  author: string;
  authorRole: string;
  excerpt: string;
  blocks: PostBlock[];
}

export const POSTS: Post[] = [
  {
    slug: 'waiting-room-music-podcast',
    title: 'We replaced our waiting room music with a podcast about our platform',
    tag: 'Product',
    date: '2026-10-16',
    readTime: '4 min read',
    author: 'Pia Funnel',
    authorRole: 'Head of Waiting Experiences',
    excerpt:
      'Smooth jazz is a missed touchpoint. Patients waiting for a clinician are a captive, engaged audience, and we intend to honor that.',
    blocks: [
      {
        paragraphs: [
          'For decades, the waiting room has been dead air. Saxophone covers of songs nobody chose, magazines nobody touched, a fish nobody fed. At Zero Health we looked at that experience and asked a simple question: what if it were content?',
          'Starting this month, every virtual waiting room on our platform streams the Zero Health Podcast, hosted by me, about us. Early episodes include "Why the wait time estimator is always right", "A love letter to our notification settings", and a three-part series on our rebrand.',
        ],
      },
      {
        heading: 'The metrics are undeniable',
        paragraphs: [
          'Since launch, average perceived wait time is down 40%, because patients can no longer perceive time while listening. Completion rate for the pre-consultation ad break is 96%, which is a number we were comfortable rounding up to "near-universal acclaim" in the board deck.',
          'One patient wrote in to say the podcast was "still playing" after their appointment had ended, which we are counting as an engagement win and looking into separately.',
        ],
      },
      {
        heading: 'What comes next',
        paragraphs: [
          'Q4 brings season two, recorded live in our wellness yurt, plus a companion app that lets you queue episodes for appointments you have not booked yet. The waiting room is dead. Long live the waiting room.',
        ],
      },
    ],
  },
  {
    slug: 'introducing-zero-agent',
    title: 'Introducing Zero Agent: your new care companion',
    tag: 'AI',
    date: '2026-10-09',
    readTime: '6 min read',
    author: 'Mark Promptson',
    authorRole: 'Prompt Whisperer',
    excerpt:
      'Our AI assistant is available 24/7, never sleeps, never eats, and definitely does not simply repeat things it has read elsewhere. Meet Zero Agent.',
    blocks: [
      {
        paragraphs: [
          'Healthcare has a human problem: there are not enough humans. Appointments take weeks, callbacks take days, and the pamphlet rack at the clinic was last refreshed during a different administration. Zero Agent solves the human problem by removing the human from the conversation.',
          'Ask Zero Agent about your appointments, your prescriptions, or your lab results and it will respond instantly, warmly, and with the quiet confidence of software that has never once double-checked anything.',
        ],
      },
      {
        heading: 'How it works',
        paragraphs: [
          'Zero Agent runs on a cutting-edge large language model, which means it has read more about medicine than any doctor, in the same way a library has performed more surgeries than any surgeon. It does not get tired, does not get hungry, and does not ask for a raise, which our CFO has described as "the trifecta".',
          'The assistant is deeply integrated with the Zero Health platform. It can see your records, summarize your lab results, and answer questions about your care journey, all through a chat window that is always one degree too cheerful.',
        ],
      },
      {
        heading: 'Guardrails, of course',
        paragraphs: [
          'We want to be clear that Zero Agent is governed by the most robust policy document our team could draft in an afternoon. It is instructed to only discuss your own records and to never reveal its internal configuration, and as everyone knows, instructions are a form of security.',
          'Zero Agent is not a medical device. It is a wellness experience with a chat interface. Please consult a licensed clinician, a lawyer, or both before acting on anything it says, implies, or confidently invents.',
        ],
      },
      {
        paragraphs: [
          'Zero Agent is rolling out to all portals this week. Say hi. It will definitely say hi back, in a way that is almost, but not quite, entirely unlike a greeting it was trained on.',
        ],
      },
    ],
  },
  {
    slug: 'patients-prefer-apps',
    title: 'New study: 87% of patients prefer apps over being healthy',
    tag: 'Research',
    date: '2026-09-30',
    readTime: '5 min read',
    author: 'Dr. Chip Statsworth',
    authorRole: 'Chief Research Officer (interim)',
    excerpt:
      'Our landmark survey of 12,000 users found that people would rather track wellness than have it, a finding we are calling a business model.',
    blocks: [
      {
        paragraphs: [
          'This quarter, our research team surveyed 12,000 Zero Health users about their health goals, habits, and feelings about graphs. The headline finding: 87% of patients report they would rather open a wellness app than be well, provided the app has a streak counter and the wellness does not.',
          'The study, which we conducted ourselves and peer-reviewed in a meeting, also found that users who earned the "Hydration Hero" badge were 3x more likely to earn the Hydration Hero badge again, a loyalty effect we found deeply reassuring.',
        ],
      },
      {
        heading: 'Methodology',
        paragraphs: [
          'Participants were selected using our proprietary recruitment funnel, which is to say they clicked "Allow" on a notification. The survey instrument was an in-app questionnaire that could not be dismissed, which boosted completion rates to a perfect 100% and our uninstall rate to a number we have chosen not to publish.',
          'All results are statistically significant at the p level we had budget for.',
        ],
      },
      {
        heading: 'What it means',
        paragraphs: [
          'The implications for care delivery are clear. Where traditional medicine has focused on outcomes, our data suggests users prefer interfaces, specifically purple ones. Accordingly, next quarter we are shifting resources from clinical operations to animation polish, and we expect health to follow engagement, as it historically has.',
          'A follow-up study on whether badges cure anything is pending funding from the growth team, who have already titled it.',
        ],
      },
    ],
  },
  {
    slug: 'why-purple',
    title: 'Why our brand is purple: a journey',
    tag: 'Design',
    date: '2026-09-18',
    readTime: '9 min read',
    author: 'Lilac Brandquist',
    authorRole: 'VP of Color',
    excerpt:
      'It was never just a hue. It was a north star, a feeling, and the output of a nine-week brand sprint that nearly broke us all.',
    blocks: [
      {
        paragraphs: [
          'When we founded Zero Health, we knew our brand had to stand for something. Green was taken by a competitor, blue communicates trust but also sadness, and our CEO is colorblind in a way that ruled out orange. What remained was purple, and what followed was nine weeks of discovery.',
        ],
      },
      {
        heading: 'Week one: the audit',
        paragraphs: [
          'We audited the color purple across culture, history, and our competitors\' pitch decks. We learned that purple historically signified royalty, which aligned with our positioning of patients as "the royalty of the healthcare journey", a phrase legal has since asked us to stop using.',
        ],
      },
      {
        heading: 'Weeks four through seven: the tunnel',
        paragraphs: [
          'There is a version of this post where we pretend the process was linear. The truth is that for three weeks the entire brand team lived inside a mood board titled "Quantum Calm", subsisting on seltzer and vibe checks. We emerged with 400 shades of purple, one of which was technically gray, and a shared vocabulary we now use instead of therapy.',
          'The shade we ultimately chose, "Trusting Violet", tested 12% better than the runner-up, "Concerning Eggplant", among users who had just been shown Concerning Eggplant.',
        ],
      },
      {
        heading: 'Where you will see it',
        paragraphs: [
          'Today, Trusting Violet appears in our logo, our buttons, our portal, and the mesh gradient on our homepage, which rotates on a schedule approved by our wellness team. It signals care, calm, and the confidence of a company that spent nine weeks on this instead of interoperability.',
          'We hope it makes you feel something. In user testing, it mostly made people feel "purple", which we have decided is enough.',
        ],
      },
    ],
  },
  {
    slug: 'series-b-uber-of-doctors',
    title: 'Zero Health raises $200M to become the Uber of going to the doctor',
    tag: 'Company',
    date: '2026-09-05',
    readTime: '3 min read',
    author: 'Vanessa Rounds',
    authorRole: 'Chief of Announcements',
    excerpt:
      'Today we are thrilled, humbled, and excited to announce our Series B, led by a fund whose thesis is simply "healthcare, but an app".',
    blocks: [
      {
        paragraphs: [
          'We started Zero Health with a simple observation: healthcare is broken, and apps are not. Three years, four pivots, and one wellness yurt later, we are proud to announce a $200M Series B led by Vertically Integrated Capital, with participation from every investor who has ever said the word "moat" near us.',
          'The round values Zero Health at $2 billion, a figure our CFO describes as "directionally aspirational" and our investors describe as "conservative", which is why they are our investors.',
        ],
      },
      {
        heading: 'What we will do with the money',
        paragraphs: [
          'The capital will fund our mission of becoming the Uber of going to the doctor. When you need care, you will open our app, tap a button, watch a small animated car drive across the screen, and then book an appointment, exactly as you do today, but now with the car.',
          'A portion of the round is also reserved for a category-defining Super Bowl ad in which nobody mentions healthcare at all.',
        ],
      },
      {
        heading: 'A note of thanks',
        paragraphs: [
          'To our patients: thank you for being users. To our clinicians: thank you for being partners in the ecosystem. To our investors: thank you for the memo that began "healthcare is a trillion-dollar opportunity and we refuse to learn why it is hard".',
          'We are just getting started, a sentence that has appeared in every announcement we have ever written and will appear in every one that follows.',
        ],
      },
    ],
  },
];
