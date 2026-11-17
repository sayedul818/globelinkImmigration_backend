import { Schema, model } from 'mongoose';

const pageSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    title: { type: String, required: true, trim: true },
    excerpt: { type: String, trim: true },
    body: { type: String, required: true },
    seoTitle: { type: String, trim: true },
    seoDescription: { type: String, trim: true },
    status: { type: String, enum: ['DRAFT', 'PUBLISHED'], default: 'DRAFT' },
    publishedAt: { type: Date },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

const blogPostSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    title: { type: String, required: true, trim: true },
    excerpt: { type: String, trim: true },
    body: { type: String, required: true },
    coverImageUrl: { type: String, trim: true },
    category: { type: String, trim: true },
    seoTitle: { type: String, trim: true },
    seoDescription: { type: String, trim: true },
    tags: [{ type: String, trim: true }],
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['DRAFT', 'PUBLISHED'], default: 'DRAFT' },
    publishedAt: { type: Date },
  },
  { timestamps: true },
);

const analyticsEventSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    path: { type: String, required: true, trim: true },
    sessionId: { type: String, trim: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    metadata: { type: Schema.Types.Mixed },
    occurredAt: { type: Date, required: true },
  },
  { timestamps: true },
);

analyticsEventSchema.index({ name: 1, occurredAt: -1 });
analyticsEventSchema.index({ path: 1, occurredAt: -1 });

export const ContentPage = model('ContentPage', pageSchema);
export const BlogPost = model('BlogPost', blogPostSchema);
export const AnalyticsEvent = model('AnalyticsEvent', analyticsEventSchema);
