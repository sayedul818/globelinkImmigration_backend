import { Schema, model } from 'mongoose';

const scoreSchema = new Schema(
  {
    academicProfile: { type: Number, min: 1, max: 5 },
    englishProficiency: { type: Number, min: 1, max: 5 },
    financialCapacity: { type: Number, min: 1, max: 5 },
    travelVisaHistory: { type: Number, min: 1, max: 5 },
    documentReadiness: { type: Number, min: 1, max: 5 },
    notes: { type: String, trim: true },
  },
  { _id: false },
);

const assessmentSchema = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, unique: true },
    purpose: { type: String, trim: true },
    targetCountry: { type: Schema.Types.ObjectId, ref: 'Country' },
    age: { type: Number, min: 0 },
    maritalStatus: { type: String, trim: true },
    highestQualification: { type: String, trim: true },
    lastInstitutionYear: { type: String, trim: true },
    studyGapYears: { type: Number, min: 0 },
    workExperienceYears: { type: Number, min: 0 },
    currentOccupationEmployer: { type: String, trim: true },
    annualBudget: { type: Number, min: 0 },
    fundingSource: { type: String, trim: true },
    sponsorNameRelation: { type: String, trim: true },
    sponsorIncome: { type: Number, min: 0 },
    bankBalanceRange: { type: String, trim: true },
    propertyAssets: { type: String, trim: true },
    countriesVisited: { type: String, trim: true },
    previousVisas: { type: String, trim: true },
    visaRefusal: { type: Boolean, default: false },
    refusalDetails: { type: String, trim: true },
    riskIndicators: [{ type: String, trim: true }],
    scores: { type: scoreSchema, required: true },
    scoreNotes: {
      academicProfile: { type: String, trim: true },
      englishProficiency: { type: String, trim: true },
      financialCapacity: { type: String, trim: true },
      travelVisaHistory: { type: String, trim: true },
      documentReadiness: { type: String, trim: true },
    },
    totalScore: { type: Number, min: 0, max: 25 },
    suitability: { type: String, enum: ['HIGH', 'MEDIUM', 'LOW'] },
    recommendedCountryProgram: { type: String, trim: true },
    recommendedVisaRoute: { type: String, trim: true },
    estimatedTimeline: { type: String, trim: true },
    estimatedTotalCost: { type: String, trim: true },
    counsellorNotes: { type: String, trim: true },
    nextSteps: { type: String, trim: true },
    assessedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    assessedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

export const Assessment = model('Assessment', assessmentSchema);
