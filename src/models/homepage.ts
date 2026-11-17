import { Schema, model } from 'mongoose';
import { SECTION_TYPES } from '../homepage/schemas.js';

/**
 * Editable copy of a section. `content` is polymorphic per section type and is
 * validated by the Zod schemas in homepage/schemas.ts before it is stored.
 */
const sectionBodySchema = new Schema(
  {
    eyebrow: { type: String, default: '' },
    title: { type: String, default: '' },
    subtitle: { type: String, default: '' },
    content: { type: Schema.Types.Mixed, default: {} },
  },
  { _id: false, minimize: false },
);

const homepageSectionSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    type: { type: String, required: true, enum: SECTION_TYPES },
    /** Admin-facing name, e.g. "Featured universities". */
    label: { type: String, required: true, trim: true },
    enabled: { type: Boolean, default: true },
    displayOrder: { type: Number, default: 0, index: true },
    /** Working copy edited in the admin panel. */
    draft: { type: sectionBodySchema, required: true },
    /** Live copy served to visitors; null until first published. */
    published: { type: sectionBodySchema, default: null },
    publishedAt: { type: Date },
    draftUpdatedAt: { type: Date },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, minimize: false },
);

const siteSettingsSchema = new Schema(
  {
    /** Singleton key; always "site". */
    key: { type: String, required: true, unique: true, default: 'site' },
    companyName: { type: String, required: true, trim: true },
    tagline: { type: String, trim: true },
    logoUrl: { type: String, trim: true },
    logoLightUrl: { type: String, trim: true },
    contact: {
      email: { type: String, trim: true },
      phone: { type: String, trim: true },
      whatsapp: { type: String, trim: true },
      address: { type: String, trim: true },
      officeHours: { type: String, trim: true },
    },
    social: {
      type: [{ platform: { type: String, trim: true }, url: { type: String, trim: true } }],
      default: [],
    },
    ctaDefaults: {
      primary: { label: { type: String, trim: true }, url: { type: String, trim: true } },
      secondary: { label: { type: String, trim: true }, url: { type: String, trim: true } },
    },
    seo: {
      title: { type: String, trim: true },
      description: { type: String, trim: true },
      ogImageUrl: { type: String, trim: true },
    },
    footer: {
      about: { type: String, trim: true },
      copyright: { type: String, trim: true },
    },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

export const HomepageSection = model('HomepageSection', homepageSectionSchema);
export const SiteSettingsModel = model('SiteSettings', siteSettingsSchema);
