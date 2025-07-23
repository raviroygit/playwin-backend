import { Schema, model, Types, Document } from 'mongoose';

export interface IWithdrawal extends Document {
  user: Types.ObjectId;
  amount: number;
  walletType: 'main' | 'bonus';
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  note?: string;
  processedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const withdrawalSchema = new Schema<IWithdrawal>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  walletType: { type: String, enum: ['main', 'bonus'], required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'completed'], default: 'pending' },
  note: { type: String },
  processedBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export const Withdrawal = model<IWithdrawal>('Withdrawal', withdrawalSchema); 