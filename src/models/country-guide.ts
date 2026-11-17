import { Schema, model } from 'mongoose';

const richBlockSchema = new Schema(
  {
    type: { type: String, enum: ['PARAGRAPH', 'HEADING', 'BULLET_LIST', 'NUMBERED_LIST', 'QUOTE', 'DIVIDER'], required: true },
    text: { type: String, trim: true },
    items: [{ type: String, trim: true }],
    linkText: { type: String, trim: true },
    linkUrl: { type: String, trim: true },
    bold: { type: Boolean, default: false },
    italic: { type: Boolean, default: false },
    underline: { type: Boolean, default: false },
  },
  { _id: false },
);

const stepSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    shortDescription: { type: String, required: true, trim: true },
    estimatedTime: { type: String, trim: true },
    icon: { type: String, trim: true, default: 'CircleCheck' },
    iconColor: { type: String, trim: true, default: '#159b8e' },
    iconBackground: { type: String, trim: true, default: '#e8f5f3' },
    cardBackground: { type: String, trim: true, default: '#ffffff' },
    borderColor: { type: String, trim: true, default: '#dce5ed' },
    borderRadius: { type: Number, min: 0, max: 24, default: 10 },
    fontFamily: { type: String, enum: ['Arial', 'DM Sans', 'Manrope', 'Georgia'], default: 'DM Sans' },
    titleFontSize: { type: Number, min: 14, max: 30, default: 18 },
    bodyFontSize: { type: Number, min: 11, max: 18, default: 14 },
    fontWeight: { type: Number, enum: [400, 500, 600, 700, 800], default: 700 },
    textAlign: { type: String, enum: ['left', 'center', 'right'], default: 'left' },
    lineHeight: { type: Number, min: 1.2, max: 2, default: 1.6 },
    letterSpacing: { type: Number, min: -0.5, max: 2, default: 0 },
    textColor: { type: String, trim: true, default: '#173b63' },
    bodyTextColor: { type: String, trim: true, default: '#526373' },
    highlightColor: { type: String, trim: true, default: '#e8f5f3' },
    content: { type: [richBlockSchema], default: [] },
    imageUrl: { type: String, trim: true },
    imageAlt: { type: String, trim: true },
    documents: [{ type: String, trim: true }],
    checklist: [{ type: String, trim: true }],
    notice: { type: String, trim: true },
    noticeType: { type: String, enum: ['INFO', 'WARNING'], default: 'INFO' },
    buttonText: { type: String, trim: true },
    buttonUrl: { type: String, trim: true },
    badge: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { _id: true },
);

const guideSchema = new Schema(
  {
    countryId: { type: Schema.Types.ObjectId, ref: 'Country', required: true, index: true },
    category: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true, trim: true },
    title: { type: String, required: true, trim: true },
    subtitle: { type: String, trim: true },
    description: { type: String, trim: true },
    heroImageUrl: { type: String, trim: true },
    heroImageAlt: { type: String, trim: true },
    documents: [{ name: { type: String, trim: true }, description: { type: String, trim: true } }],
    notes: [{ title: { type: String, trim: true }, body: { type: String, trim: true }, type: { type: String, enum: ['INFO', 'WARNING'], default: 'INFO' } }],
    benefits: [{ title: { type: String, trim: true }, description: { type: String, trim: true }, icon: { type: String, trim: true, default: 'ShieldCheck' } }],
    ctaTitle: { type: String, trim: true, default: 'Planning your next step?' },
    ctaDescription: { type: String, trim: true, default: 'Talk with our team about your study and visa plans.' },
    ctaButtonText: { type: String, trim: true, default: 'Talk to an Expert' },
    ctaButtonUrl: { type: String, trim: true, default: '/contact' },
    seoTitle: { type: String, trim: true, maxlength: 70 },
    seoDescription: { type: String, trim: true, maxlength: 160 },
    status: { type: String, enum: ['DRAFT', 'PUBLISHED'], default: 'DRAFT', index: true },
    displayOrder: { type: Number, default: 0 },
    steps: { type: [stepSchema], default: [] },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    publishedAt: { type: Date },
  },
  { timestamps: true },
);

guideSchema.index({ countryId: 1, slug: 1 }, { unique: true });

export const CountryGuide = model('CountryGuide', guideSchema);
