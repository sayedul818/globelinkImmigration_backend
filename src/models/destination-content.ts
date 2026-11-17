import { Schema, model } from 'mongoose';

const maxPointsPerTopic = 50;
const maxPointLength = 500;

const topicSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    summary: { type: String, required: true, trim: true, maxlength: 2500 },
    visualTitle: { type: String, required: true, trim: true, maxlength: 200 },
    points: {
      type: [{ type: String, trim: true, maxlength: maxPointLength }],
      required: true,
      validate: {
        validator: (points: string[]) =>
          points.length > 0 &&
          points.length <= maxPointsPerTopic &&
          points.every((point) => point.length <= maxPointLength),
      },
    },
  },
  { _id: false },
);

const destinationContentSchema = new Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    },
    heroTitle: { type: String, required: true, trim: true, maxlength: 200 },
    heroDescription: { type: String, required: true, trim: true, maxlength: 1000 },
    topics: {
      type: [topicSchema],
      required: true,
      validate: { validator: (topics: unknown[]) => topics.length > 0 && topics.length <= 20 },
    },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

export const DestinationContent = model('DestinationContent', destinationContentSchema);
