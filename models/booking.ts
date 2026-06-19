import mongoose, { Schema, Document, Model } from 'mongoose';

export type BookingStatus = 'pending' | 'approved' | 'rejected' | 'contacted' | 'completed';

export interface IStatusHistory {
  status: BookingStatus;
  changedAt: Date;
  notes: string;
}

export interface IBooking extends Document {
  // User & domain
  email: string;
  domain: string;
  // Form fields
  name: string;
  phoneNumber: string;
  bnbName: string;
  checkInDate: string;   // mm/dd/yyyy
  checkOutDate: string;  // mm/dd/yyyy
  vehicle?: string;
  priceExpectation: string;
  priceType: 'nightly' | 'total';
  comments?: string;
  // Admin fields
  status: BookingStatus;
  notes: string;
  statusHistory: IStatusHistory[];
  createdAt: Date;
  updatedAt: Date;
}

const StatusHistorySchema = new Schema<IStatusHistory>(
  {
    status: { type: String, required: true },
    changedAt: { type: Date, default: () => new Date() },
    notes: { type: String, default: '' },
  },
  { _id: false }
);

const BookingSchema = new Schema<IBooking>(
  {
    email:            { type: String, required: true, lowercase: true, trim: true },
    domain:           { type: String, required: true },
    name:             { type: String, required: true, trim: true },
    phoneNumber:      { type: String, required: true, trim: true },
    bnbName:          { type: String, required: true, trim: true },
    checkInDate:      { type: String, required: true },
    checkOutDate:     { type: String, required: true },
    vehicle:          { type: String, default: '' },
    priceExpectation: { type: String, required: true },
    priceType:        { type: String, enum: ['nightly', 'total'], required: true },
    comments:         { type: String, default: '' },
    status:           {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'contacted', 'completed'],
      default: 'pending',
    },
    notes:         { type: String, default: '' },
    statusHistory: { type: [StatusHistorySchema], default: [] },
  },
  { timestamps: true }
);

BookingSchema.index({ email: 1, domain: 1 });
BookingSchema.index({ status: 1, createdAt: -1 });

const Booking: Model<IBooking> =
  mongoose.models.Booking ?? mongoose.model<IBooking>('Booking', BookingSchema);

export default Booking;
