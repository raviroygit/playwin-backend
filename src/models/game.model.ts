import { Schema, model, Document } from 'mongoose';

export interface IGame extends Document {
  timeWindow: string;
  status: 'open' | 'closed' | 'result';
  totalPool: number;
  resultNumber?: number;
  createdAt: Date;
  updatedAt: Date;
}

const gameSchema = new Schema<IGame>({
  timeWindow: { type: String, required: true },
  status: { type: String, enum: ['open', 'closed', 'result'], required: true },
  totalPool: { type: Number, default: 0 },
  resultNumber: { type: Number },
}, { timestamps: true });

export const Game = model<IGame>('Game', gameSchema); 