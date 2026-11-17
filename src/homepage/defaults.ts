import type { SectionType, SiteSettings } from './schemas.js';

/**
 * Initial homepage content, written to the database the first time the
 * homepage is requested. After that, everything is edited in the admin panel;
 * this file is never read again for an existing installation.
 *
 * Sections whose content must be real (statistics, testimonials, featured
 * universities and scholarships) start empty, so the homepage hides them until
 * an administrator adds genuine records.
 */

export interface SectionSeed {
  key: string;
  type: SectionType;
  label: string;
  enabled: boolean;
  body: { eyebrow: string; title: string; subtitle: string; content: Record<string, unknown> };
}

const destination = (id: string, name: string, countryCode: string, url: string, description: string, featured = false) => ({
  id,
  enabled: true,
  name,
  countryCode,
  url,
  imageUrl: '',
  imageAlt: '',
  description,
  intake: '',
  ctaLabel: 'Explore',
  featured,
});

export const DEFAULT_SECTIONS: SectionSeed[] = [
  {
    key: 'hero',
    type: 'hero',
    label: 'Hero',
    enabled: true,
    body: {
      eyebrow: 'Your global education partner',
      title: 'Your future has no borders.',
      subtitle:
        'Explore international education, discover new destinations and take your next step with thoughtful, personal guidance.',
      content: {
        highlight: 'no borders.',
        primaryCta: { label: 'Explore Study Destinations', url: '/destinations' },
        secondaryCta: { label: 'Get Free Consultation', url: '/contact' },
        imageUrl: '',
        imageAlt: 'Students on a university campus',
        videoUrl: '',
        chips: ['Canada', 'UK', 'Australia', 'USA', 'Europe', 'Malaysia'],
        floatingCards: [],
      },
    },
  },
  {
    key: 'stats',
    type: 'stats',
    label: 'Statistics',
    enabled: true,
    body: { eyebrow: '', title: '', subtitle: '', content: { items: [] } },
  },
  {
    key: 'destinations',
    type: 'destinations',
    label: 'Study destinations',
    enabled: true,
    body: {
      eyebrow: 'Study destinations',
      title: 'Where will your studies take you?',
      subtitle: 'Explore leading study destinations and find the country that fits your goals, budget and ambitions.',
      content: {
        items: [
          destination('canada', 'Canada', 'CA', '/destinations/canada', 'Explore Canadian study options with guidance on comparing institutions, provinces, programmes and the application steps ahead.', true),
          destination('uk', 'United Kingdom', 'GB', '/destinations/uk', 'Explore universities and courses across the UK with a considered plan for your academic goals and application timeline.', true),
          destination('australia', 'Australia', 'AU', '/destinations/australia', "Explore Australia's universities, courses and student experience with a plan built around your academic goals."),
          destination('usa', 'United States', 'US', '/destinations/usa', 'Explore the breadth of US institutions and programmes, then build a shortlist around your academic interests and priorities.'),
          destination('germany', 'Germany', 'DE', '/destinations/germany', 'Explore German universities and programmes, comparing language, qualification recognition and course-specific entry requirements.'),
          destination('malaysia', 'Malaysia', 'MY', '/destinations/malaysia', 'Explore Malaysian universities and programmes, comparing campus options, course details and the requirements for your intended pathway.'),
          destination('france', 'France', 'FR', '/destinations/france', 'Explore study in France by programme, language and institution, and verify application details through official education sources.'),
          destination('finland', 'Finland', 'FI', '/destinations/europe/finland', 'Explore Finnish universities and programmes with attention to language of instruction, admissions routes and the student experience.'),
          destination('denmark', 'Denmark', 'DK', '/destinations/europe/denmark', 'Explore Danish study options by programme, teaching language and institution, with a plan based on current official requirements.'),
          destination('new-zealand', 'New Zealand', 'NZ', '/destinations/new-zealand', 'Explore New Zealand study options by institution, course and location, with current requirements confirmed through official sources.'),
          destination('korea', 'South Korea', 'KR', '/destinations/korea', 'Explore South Korean universities and courses by subject, language and campus, with requirements verified through official channels.'),
          destination('china', 'China', 'CN', '/destinations/china', 'Explore higher-education options in China by institution, subject and programme language, using current official information.'),
        ],
        allCta: { label: 'View all destinations', url: '/destinations' },
      },
    },
  },
  {
    key: 'features',
    type: 'features',
    label: 'Why choose Globelink',
    enabled: true,
    body: {
      eyebrow: 'Why Globelink',
      title: 'Guidance you can plan your future around',
      subtitle: 'Every student’s path is different. Our support is built around your goals, not a one-size-fits-all process.',
      content: {
        imageUrl: '',
        imageAlt: '',
        items: [
          { id: 'personal', enabled: true, icon: 'Compass', title: 'Personalized Guidance', text: 'Advice shaped around your academic background, goals and budget.' },
          { id: 'matching', enabled: true, icon: 'GraduationCap', title: 'University & Program Matching', text: 'A shortlist of universities and programs that genuinely fit your profile.' },
          { id: 'application', enabled: true, icon: 'FileCheck2', title: 'Application Support', text: 'Organized, consistent applications from documents to submission.' },
          { id: 'visa', enabled: true, icon: 'ShieldCheck', title: 'Visa Assistance', text: 'Clear preparation for your student visa, step by step.' },
          { id: 'departure', enabled: true, icon: 'Plane', title: 'Pre-Departure Guidance', text: 'Practical preparation so you arrive ready to start.' },
        ],
      },
    },
  },
  {
    key: 'services',
    type: 'services',
    label: 'Services',
    enabled: true,
    body: {
      eyebrow: 'Our services',
      title: 'Support for every part of your journey',
      subtitle: 'Four core services, one team guiding you from your first application to your first day abroad.',
      content: {
        items: [
          { id: 'admission', enabled: true, icon: 'GraduationCap', title: 'Admission Support', text: 'Find the right university and program, and prepare a strong, complete application.', url: '/admission-support', ctaLabel: 'Learn more', imageUrl: '', imageAlt: '' },
          { id: 'visa', enabled: true, icon: 'Stamp', title: 'Visa Support', text: 'From document preparation to biometrics and submission, with support until a decision.', url: '/visa-support', ctaLabel: 'Learn more', imageUrl: '', imageAlt: '' },
          { id: 'health', enabled: true, icon: 'HeartPulse', title: 'Medical & Health Insurance', text: 'Guidance on medical examinations and health insurance requirements for your destination.', url: '/medical-health-insurance', ctaLabel: 'Learn more', imageUrl: '', imageAlt: '' },
          { id: 'accommodation', enabled: true, icon: 'House', title: 'Student Accommodation', text: 'Find a place that feels like home, matched to your location and budget.', url: '/student-accommodation', ctaLabel: 'Learn more', imageUrl: '', imageAlt: '' },
        ],
      },
    },
  },
  {
    key: 'journey',
    type: 'journey',
    label: 'Application journey',
    enabled: true,
    body: {
      eyebrow: 'Your application journey',
      title: 'From first conversation to first day abroad',
      subtitle: 'A clear path with support at every stage.',
      content: {
        items: [
          { id: 'profile', enabled: true, icon: 'UserRound', title: 'Profile Assessment', text: 'Understand your academic background, goals and budget.' },
          { id: 'selection', enabled: true, icon: 'Search', title: 'University Selection', text: 'Build a shortlist of universities and programs that fit.' },
          { id: 'application', enabled: true, icon: 'FileCheck2', title: 'Application', text: 'Prepare and submit complete, consistent applications.' },
          { id: 'offer', enabled: true, icon: 'MailCheck', title: 'Offer / LOA', text: 'Review offers and confirm your place.' },
          { id: 'visa', enabled: true, icon: 'Stamp', title: 'Visa Preparation', text: 'Organize documents and prepare your visa application.' },
          { id: 'departure', enabled: true, icon: 'ClipboardCheck', title: 'Pre-Departure', text: 'Accommodation, insurance and travel essentials.' },
          { id: 'travel', enabled: true, icon: 'Plane', title: 'Travel', text: 'Arrive ready to begin your studies.' },
        ],
      },
    },
  },
  {
    key: 'universities',
    type: 'universities',
    label: 'Featured universities',
    enabled: true,
    body: {
      eyebrow: 'Featured universities',
      title: 'Institutions our students explore',
      subtitle: '',
      content: { universityIds: [], cta: { label: 'Browse universities', url: '/universities' } },
    },
  },
  {
    key: 'intakes',
    type: 'intakes',
    label: 'Intakes',
    enabled: true,
    body: {
      eyebrow: 'Intakes',
      title: 'Plan around the right intake',
      subtitle: 'Most universities admit students at set points in the year. Intake availability varies by country, institution and program.',
      content: {
        items: [
          { id: 'september', enabled: true, name: 'September', season: 'Fall', description: 'The main intake at many universities, usually with the widest choice of programs.', note: '' },
          { id: 'january', enabled: true, name: 'January', season: 'Winter', description: 'A second intake offered by many institutions for a range of programs.', note: '' },
          { id: 'may', enabled: true, name: 'May', season: 'Summer', description: 'A smaller intake available at selected institutions and programs.', note: '' },
        ],
        cta: { label: 'Plan my intake', url: '/contact' },
      },
    },
  },
  {
    key: 'scholarships',
    type: 'scholarships',
    label: 'Scholarships',
    enabled: true,
    body: {
      eyebrow: 'Scholarships',
      title: 'Funding opportunities to explore',
      subtitle: 'Eligibility and awards are decided by each provider. Always check the official details before applying.',
      content: { scholarshipIds: [], cta: { label: 'Explore scholarships', url: '/scholarships' } },
    },
  },
  {
    key: 'testimonials',
    type: 'testimonials',
    label: 'Success stories',
    enabled: true,
    body: {
      eyebrow: 'Success stories',
      title: 'Students who started here',
      subtitle: '',
      content: { items: [] },
    },
  },
  {
    key: 'blog',
    type: 'blog',
    label: 'Insights',
    enabled: true,
    body: {
      eyebrow: 'Insights',
      title: 'Guides and news for your journey',
      subtitle: '',
      content: { mode: 'latest', limit: 3, postIds: [], cta: { label: '', url: '' } },
    },
  },
  {
    key: 'cta',
    type: 'cta',
    label: 'Final call to action',
    enabled: true,
    body: {
      eyebrow: 'Your next chapter',
      title: 'Your global education journey starts here.',
      subtitle: 'Talk to our team about your goals and get a clear, realistic plan for studying abroad.',
      content: {
        primaryCta: { label: 'Book a Consultation', url: '/contact' },
        secondaryCta: { label: 'Explore Destinations', url: '/destinations' },
        imageUrl: '',
        imageAlt: '',
      },
    },
  },
];

/** Starting content for a section an admin adds later. */
export function blankSectionBody(type: SectionType): SectionSeed['body'] {
  const empty: Record<SectionType, Record<string, unknown>> = {
    hero: { chips: [], floatingCards: [], primaryCta: {}, secondaryCta: {} },
    stats: { items: [] },
    destinations: { items: [], allCta: {} },
    features: { items: [] },
    services: { items: [] },
    journey: { items: [] },
    universities: { universityIds: [], cta: {} },
    intakes: { items: [], cta: {} },
    scholarships: { scholarshipIds: [], cta: {} },
    testimonials: { items: [] },
    blog: { mode: 'latest', limit: 3, postIds: [], cta: {} },
    cta: { primaryCta: {}, secondaryCta: {} },
  };
  return { eyebrow: '', title: type === 'hero' ? 'New headline' : '', subtitle: '', content: empty[type] };
}

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  companyName: 'Globelink Immigration',
  tagline: 'Your Study Abroad Partner',
  logoUrl: '',
  logoLightUrl: '',
  contact: { email: '', phone: '', whatsapp: '', address: '', officeHours: '' },
  social: [],
  ctaDefaults: {
    primary: { label: 'Book a Consultation', url: '/contact' },
    secondary: { label: 'Explore Destinations', url: '/destinations' },
  },
  seo: {
    title: 'Globelink Immigration | Study Abroad & Student Visa Guidance',
    description:
      'Personal guidance for studying abroad: university admission, student visas, health insurance and accommodation.',
    ogImageUrl: '',
  },
  footer: {
    about: 'Thoughtful guidance for your education. A world of possibilities for your future.',
    copyright: '',
  },
};
