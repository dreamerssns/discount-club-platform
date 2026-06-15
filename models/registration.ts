import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IRegistration extends Document {
  email: string;
  code: string;
  domain: string;
  verified: boolean;
  createdAt: Date;
  expiresAt: Date;
  verifiedAt?: Date;
  attempts: number;
}

const RegistrationSchema = new Schema<IRegistration>(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    code: { type: String, required: true },
    domain: { type: String, required: true },
    verified: { type: Boolean, default: false },
    expiresAt: { type: Date, required: true },
    verifiedAt: { type: Date },
    attempts: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// TTL index: MongoDB auto-deletes docs 0 seconds after expiresAt
RegistrationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
// Unique per email+domain so a user can't have two active codes at once
RegistrationSchema.index({ email: 1, domain: 1 }, { unique: true });

const Registration: Model<IRegistration> =
  mongoose.models.Registration ??
  mongoose.model<IRegistration>('Registration', RegistrationSchema);

export default Registration;
