import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBooking extends Document {
  email: string;
  domain: string;
  submittedAt: Date;
  bookingData: Record<string, unknown>;
  status: 'pending' | 'approved' | 'rejected';
}

const BookingSchema = new Schema<IBooking>(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    domain: { type: String, required: true },
    submittedAt: { type: Date, default: () => new Date() },
    bookingData: { type: Schema.Types.Mixed, default: {} },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  },
  { timestamps: true }
);

BookingSchema.index({ email: 1, domain: 1, submittedAt: -1 });

const Booking: Model<IBooking> =
  mongoose.models.Booking ?? mongoose.model<IBooking>('Booking', BookingSchema);

export default Booking;
