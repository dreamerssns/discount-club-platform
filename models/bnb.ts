import mongoose, { Schema, Document, Model } from 'mongoose';

export type BnbStatus = 'pending' | 'approved' | 'rejected';

export interface IBnb extends Document {
  ownerName: string;
  bnbName: string;
  address: string;
  email: string;
  domain: string;
  // Admin moderation
  status: BnbStatus;
  // Owner email verification (same pattern as guest Registration)
  verified: boolean;
  code: string;
  codeExpiresAt: Date;
  verifiedAt?: Date;
  attempts: number;
  createdAt: Date;
  updatedAt: Date;
}

const BnbSchema = new Schema<IBnb>(
  {
    ownerName: { type: String, required: true, trim: true },
    bnbName:   { type: String, required: true, trim: true },
    address:   { type: String, required: true, trim: true },
    email:     { type: String, required: true, lowercase: true, trim: true },
    domain:    { type: String, required: true },
    status:    { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    verified:      { type: Boolean, default: false },
    code:          { type: String, required: true },
    codeExpiresAt: { type: Date, required: true },
    verifiedAt:    { type: Date },
    attempts:      { type: Number, default: 0 },
  },
  { timestamps: true }
);

BnbSchema.index({ domain: 1, status: 1 });

const Bnb: Model<IBnb> = mongoose.models.Bnb ?? mongoose.model<IBnb>('Bnb', BnbSchema);

export default Bnb;
