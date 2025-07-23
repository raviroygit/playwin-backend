import { Schema, model, Types, Document } from 'mongoose';

export interface IWalletTransaction extends Document {
  user: Types.ObjectId;
  initiator: Types.ObjectId;
  initiatorRole: 'admin' | 'agent';
  amount: number;
  walletType: 'main' | 'bonus';
  type: 'recharge' | 'debit' | 'refund' | 'bonus';
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

const walletTransactionSchema = new Schema<IWalletTransaction>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  initiator: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  initiatorRole: { type: String, enum: ['admin', 'agent'], required: true },
  amount: { type: Number, required: true },
  walletType: { type: String, enum: ['main', 'bonus'], required: true },
  type: { type: String, enum: ['recharge', 'debit', 'refund', 'bonus'], required: true },
  note: { type: String },
}, { timestamps: true });

export const WalletTransaction = model<IWalletTransaction>('WalletTransaction', walletTransactionSchema); 