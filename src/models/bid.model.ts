import { Schema, model, Types, Document } from 'mongoose';

export interface IBid extends Document {
  user: Types.ObjectId;
  game: Types.ObjectId;
  bidNumber: number;
  bidAmount: number;
  createdAt: Date;
}

const bidSchema = new Schema<IBid>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  game: { type: Schema.Types.ObjectId, ref: 'Game', required: true },
  bidNumber: { type: Number, required: true },
  bidAmount: { type: Number, required: true },
}, { timestamps: { createdAt: true, updatedAt: false } });

export const Bid = model<IBid>('Bid', bidSchema); 