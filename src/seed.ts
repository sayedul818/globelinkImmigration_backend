import { z } from 'zod';
import { connectDatabase, disconnectDatabase } from './db.js';
import { loadConfig } from './config/env.js';
import { hashPassword } from './auth/security.js';
import { User } from './models/user.js';
import { Country } from './models/education.js';
import { CountryGuide } from './models/country-guide.js';

const countries = [
  ['Afghanistan', 'AF'], ['Albania', 'AL'], ['Algeria', 'DZ'], ['Andorra', 'AD'], ['Angola', 'AO'], ['Antigua and Barbuda', 'AG'], ['Argentina', 'AR'], ['Armenia', 'AM'], ['Australia', 'AU'], ['Austria', 'AT'], ['Azerbaijan', 'AZ'],
  ['Bahamas', 'BS'], ['Bahrain', 'BH'], ['Bangladesh', 'BD'], ['Barbados', 'BB'], ['Belarus', 'BY'], ['Belgium', 'BE'], ['Belize', 'BZ'], ['Benin', 'BJ'], ['Bhutan', 'BT'], ['Bolivia', 'BO'], ['Bosnia and Herzegovina', 'BA'], ['Botswana', 'BW'], ['Brazil', 'BR'], ['Brunei', 'BN'], ['Bulgaria', 'BG'], ['Burkina Faso', 'BF'], ['Burundi', 'BI'],
  ['Cabo Verde', 'CV'], ['Cambodia', 'KH'], ['Cameroon', 'CM'], ['Canada', 'CA'], ['Central African Republic', 'CF'], ['Chad', 'TD'], ['Chile', 'CL'], ['China', 'CN'], ['Colombia', 'CO'], ['Comoros', 'KM'], ['Congo', 'CG'], ['Costa Rica', 'CR'], ['Croatia', 'HR'], ['Cuba', 'CU'], ['Cyprus', 'CY'], ['Czechia', 'CZ'],
  ['Democratic Republic of the Congo', 'CD'], ['Denmark', 'DK'], ['Djibouti', 'DJ'], ['Dominica', 'DM'], ['Dominican Republic', 'DO'], ['Ecuador', 'EC'], ['Egypt', 'EG'], ['El Salvador', 'SV'], ['Equatorial Guinea', 'GQ'], ['Eritrea', 'ER'], ['Estonia', 'EE'], ['Eswatini', 'SZ'], ['Ethiopia', 'ET'],
  ['Fiji', 'FJ'], ['Finland', 'FI'], ['France', 'FR'], ['Gabon', 'GA'], ['Gambia', 'GM'], ['Georgia', 'GE'], ['Germany', 'DE'], ['Ghana', 'GH'], ['Greece', 'GR'], ['Grenada', 'GD'], ['Guatemala', 'GT'], ['Guinea', 'GN'], ['Guinea-Bissau', 'GW'], ['Guyana', 'GY'], ['Haiti', 'HT'], ['Honduras', 'HN'], ['Hungary', 'HU'],
  ['Iceland', 'IS'], ['India', 'IN'], ['Indonesia', 'ID'], ['Iran', 'IR'], ['Iraq', 'IQ'], ['Ireland', 'IE'], ['Israel', 'IL'], ['Italy', 'IT'], ['Jamaica', 'JM'], ['Japan', 'JP'], ['Jordan', 'JO'], ['Kazakhstan', 'KZ'], ['Kenya', 'KE'], ['Kiribati', 'KI'], ['Kuwait', 'KW'], ['Kyrgyzstan', 'KG'],
  ['Laos', 'LA'], ['Latvia', 'LV'], ['Lebanon', 'LB'], ['Lesotho', 'LS'], ['Liberia', 'LR'], ['Libya', 'LY'], ['Liechtenstein', 'LI'], ['Lithuania', 'LT'], ['Luxembourg', 'LU'], ['Madagascar', 'MG'], ['Malawi', 'MW'], ['Malaysia', 'MY'], ['Maldives', 'MV'], ['Mali', 'ML'], ['Malta', 'MT'], ['Marshall Islands', 'MH'], ['Mauritania', 'MR'], ['Mauritius', 'MU'], ['Mexico', 'MX'], ['Micronesia', 'FM'], ['Moldova', 'MD'], ['Monaco', 'MC'], ['Mongolia', 'MN'], ['Montenegro', 'ME'], ['Morocco', 'MA'], ['Mozambique', 'MZ'], ['Myanmar', 'MM'],
  ['Namibia', 'NA'], ['Nauru', 'NR'], ['Nepal', 'NP'], ['Netherlands', 'NL'], ['New Zealand', 'NZ'], ['Nicaragua', 'NI'], ['Niger', 'NE'], ['Nigeria', 'NG'], ['North Korea', 'KP'], ['North Macedonia', 'MK'], ['Norway', 'NO'], ['Oman', 'OM'], ['Pakistan', 'PK'], ['Palau', 'PW'], ['Palestine', 'PS'], ['Panama', 'PA'], ['Papua New Guinea', 'PG'], ['Paraguay', 'PY'], ['Peru', 'PE'], ['Philippines', 'PH'], ['Poland', 'PL'], ['Portugal', 'PT'],
  ['Qatar', 'QA'], ['Romania', 'RO'], ['Russia', 'RU'], ['Rwanda', 'RW'], ['Saint Kitts and Nevis', 'KN'], ['Saint Lucia', 'LC'], ['Saint Vincent and the Grenadines', 'VC'], ['Samoa', 'WS'], ['San Marino', 'SM'], ['Sao Tome and Principe', 'ST'], ['Saudi Arabia', 'SA'], ['Senegal', 'SN'], ['Serbia', 'RS'], ['Seychelles', 'SC'], ['Sierra Leone', 'SL'], ['Singapore', 'SG'], ['Slovakia', 'SK'], ['Slovenia', 'SI'], ['Solomon Islands', 'SB'], ['Somalia', 'SO'], ['South Africa', 'ZA'], ['South Korea', 'KR'], ['South Sudan', 'SS'], ['Spain', 'ES'], ['Sri Lanka', 'LK'], ['Sudan', 'SD'], ['Suriname', 'SR'], ['Sweden', 'SE'], ['Switzerland', 'CH'], ['Syria', 'SY'],
  ['Taiwan', 'TW'], ['Tajikistan', 'TJ'], ['Tanzania', 'TZ'], ['Thailand', 'TH'], ['Timor-Leste', 'TL'], ['Togo', 'TG'], ['Tonga', 'TO'], ['Trinidad and Tobago', 'TT'], ['Tunisia', 'TN'], ['Turkey', 'TR'], ['Turkmenistan', 'TM'], ['Tuvalu', 'TV'], ['Uganda', 'UG'], ['Ukraine', 'UA'], ['United Arab Emirates', 'AE'], ['United Kingdom', 'GB'], ['United States', 'US'], ['Uruguay', 'UY'], ['Uzbekistan', 'UZ'], ['Vanuatu', 'VU'], ['Vatican City', 'VA'], ['Venezuela', 'VE'], ['Vietnam', 'VN'], ['Yemen', 'YE'], ['Zambia', 'ZM'], ['Zimbabwe', 'ZW'],
] as const;

const seedSchema = z.object({
  SEED_ADMIN_EMAIL: z.string().email(),
  SEED_ADMIN_PASSWORD: z.string().min(12),
  SEED_ADMIN_FIRST_NAME: z.string().min(1),
  SEED_ADMIN_LAST_NAME: z.string().min(1),
  SEED_DEMO_COUNSELLOR_PASSWORD: z.string().min(12).optional(),
  SEED_DEMO_VISA_OFFICER_PASSWORD: z.string().min(12).optional(),
});

const config = loadConfig();
const seed = seedSchema.parse(process.env);

try {
  await connectDatabase(config.MONGODB_URI);
  const users = [
    {
      email: seed.SEED_ADMIN_EMAIL,
      password: seed.SEED_ADMIN_PASSWORD,
      firstName: seed.SEED_ADMIN_FIRST_NAME,
      lastName: seed.SEED_ADMIN_LAST_NAME,
      role: 'SUPER_ADMIN',
    },
    ...(seed.SEED_DEMO_COUNSELLOR_PASSWORD
      ? [{ email: 'counsellor.demo@globelink.local', password: seed.SEED_DEMO_COUNSELLOR_PASSWORD, firstName: 'Demo', lastName: 'Counsellor', role: 'EDUCATION_COUNSELLOR' }]
      : []),
    ...(seed.SEED_DEMO_VISA_OFFICER_PASSWORD
      ? [{ email: 'visa.demo@globelink.local', password: seed.SEED_DEMO_VISA_OFFICER_PASSWORD, firstName: 'Demo', lastName: 'Visa Officer', role: 'VISA_OFFICER' }]
      : []),
  ];

  for (const user of users) {
    await User.updateOne(
      { email: user.email.toLowerCase() },
      {
        $setOnInsert: {
          email: user.email.toLowerCase(),
          passwordHash: await hashPassword(user.password),
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isActive: true,
        },
      },
      { upsert: true },
    );
    console.log(`Seeded account: ${user.email.toLowerCase()} (${user.role})`);
  }

  for (const [name, code] of countries) {
    await Country.updateOne({ code }, { $set: { name, code, isActive: true } }, { upsert: true });
  }
  console.log(`Seeded countries: ${countries.length}`);

  const [canada, admin] = await Promise.all([
    Country.findOne({ code: 'CA' }),
    User.findOne({ email: seed.SEED_ADMIN_EMAIL.toLowerCase() }),
  ]);
  if (!canada || !admin) throw new Error('Canada and the seed administrator are required to create the demo guide.');
  await CountryGuide.updateOne(
    { countryId: canada._id, slug: 'student-visa' },
    {
      $setOnInsert: {
        countryId: canada._id,
        category: 'Study Visa',
        slug: 'student-visa',
        title: 'Canada Student Visa Process',
        subtitle: 'A practical overview of the study permit journey',
        description: 'Explore the typical stages of planning to study in Canada. Requirements and processing can change; confirm current instructions with official sources.',
        status: 'PUBLISHED',
        displayOrder: 1,
        updatedBy: admin._id,
        publishedAt: new Date(),
        seoTitle: 'Canada Student Visa Process | Globelink Immigration',
        seoDescription: 'Explore the typical stages of planning to study in Canada, from selecting a program to preparing for travel.',
        documents: [
          { name: 'Letter of Acceptance', description: 'Issued by your chosen designated learning institution.' },
          { name: 'Proof of funds', description: 'Evidence of funds for tuition, living costs and travel.' },
          { name: 'Identity documents', description: 'Valid passport and any additional identity documents requested.' },
        ],
        notes: [
          { title: 'Check the latest requirements', body: 'Provincial attestation and other study permit requirements may vary. Check current IRCC instructions before applying.', type: 'WARNING' },
          { title: 'Plan for processing time', body: 'Processing times can change and are not guaranteed. Apply early and consult the official IRCC processing-time tool.', type: 'INFO' },
        ],
        benefits: [
          { title: 'Personalized guidance', description: 'Get support tailored to your study plans and personal circumstances.', icon: 'Compass' },
          { title: 'Application preparation', description: 'Organize your application documents and review next steps with our team.', icon: 'ClipboardCheck' },
          { title: 'Ongoing support', description: 'Receive guidance through key stages of your student journey.', icon: 'MessageCircle' },
        ],
        ctaTitle: 'Planning to study in Canada?',
        ctaDescription: 'Speak with Globelink Immigration about your plans and the next steps.',
        ctaButtonText: 'Talk to an Expert',
        ctaButtonUrl: '/contact',
        steps: [
          { title: 'Choose your program', shortDescription: 'Select a program that fits your academic background, goals and budget.', icon: 'GraduationCap', content: [{ type: 'PARAGRAPH', text: 'Compare program options, admission requirements, location and expected costs before deciding.' }] },
          { title: 'Select a designated learning institution', shortDescription: 'Confirm that your chosen institution and program meet current study permit requirements.', icon: 'Building2', content: [{ type: 'PARAGRAPH', text: 'Check the institution’s current status and any program-specific requirements through official sources.' }] },
          { title: 'Apply to your institution', shortDescription: 'Prepare and submit the admission application with the requested supporting documents.', icon: 'FileText' },
          { title: 'Receive your Letter of Acceptance', shortDescription: 'Review your offer details, program dates, conditions and tuition instructions.', icon: 'MailCheck' },
          { title: 'Check provincial or territorial requirements', shortDescription: 'Confirm whether a provincial or territorial attestation letter is required for your situation.', icon: 'MapPinned', notice: 'Requirements and exemptions can change. Verify the current rules with IRCC and the relevant province or territory.', noticeType: 'WARNING' },
          { title: 'Prepare financial documents', shortDescription: 'Gather clear, consistent evidence to explain how your study and living costs will be funded.', icon: 'WalletCards' },
          { title: 'Complete required medical examinations', shortDescription: 'Check whether an immigration medical examination applies to your circumstances.', icon: 'HeartPulse' },
          { title: 'Submit your study permit application', shortDescription: 'Complete the application using the latest forms and instructions from IRCC.', icon: 'Send' },
          { title: 'Complete biometrics', shortDescription: 'If requested, schedule and attend your biometrics appointment within the stated deadline.', icon: 'Fingerprint' },
          { title: 'Wait for a decision', shortDescription: 'Monitor your application and respond promptly if additional information is requested.', icon: 'Clock3' },
          { title: 'Review the decision', shortDescription: 'Carefully read the decision letter and follow any instructions provided.', icon: 'BadgeCheck' },
          { title: 'Prepare for travel', shortDescription: 'Organize travel plans and carry the documents you may need when you arrive.', icon: 'Plane' },
        ],
      },
    },
    { upsert: true },
  );
  console.log('Seeded editable Canada student visa guide (if it did not already exist).');
} finally {
  await disconnectDatabase();
}
