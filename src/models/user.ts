import { Schema, model, type InferSchemaType } from 'mongoose';

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    role: { type: String, required: true, enum: ['SUPER_ADMIN', 'CEO', 'MANAGING_DIRECTOR', 'EDUCATION_MANAGER', 'SENIOR_EDUCATION_COUNSELLOR', 'EDUCATION_COUNSELLOR', 'VISA_OFFICER', 'ACCOUNTANT', 'MARKETING_MANAGER', 'SUPPORT_AGENT', 'CUSTOMER'] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export type UserDocument = InferSchemaType<typeof userSchema> & { _id: { toString(): string } };
export const User = model('User', userSchema);
