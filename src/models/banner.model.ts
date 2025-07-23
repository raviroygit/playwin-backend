import { Schema, model, Document } from 'mongoose';

export interface IBanner extends Document {
  imageUrl: string;
  link?: string;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

const bannerSchema = new Schema<IBanner>({
  imageUrl: { type: String, required: true },
  link: { type: String },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
}, { timestamps: true });

export const Banner = model<IBanner>('Banner', bannerSchema); 