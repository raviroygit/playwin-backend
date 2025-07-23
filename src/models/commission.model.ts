import { Schema, model, Document } from 'mongoose';

export interface ICommissionSettings extends Document {
  agentCommissionPercentage: number; // Percentage of total pool that goes to agent
  winnerPayoutPercentage: number; // Percentage of total pool that goes to winners
  adminFeePercentage: number; // Percentage that goes to admin/platform
  minBetAmount: number; // Minimum bet amount
  maxBetAmount: number; // Maximum bet amount
  updatedBy: string; // Admin who last updated these settings
  updatedAt: Date;
}

const commissionSettingsSchema = new Schema<ICommissionSettings>({
  agentCommissionPercentage: { 
    type: Number, 
    required: true, 
    min: 0, 
    max: 100,
    default: 5 // Default 5% commission for agents
  },
  winnerPayoutPercentage: { 
    type: Number, 
    required: true, 
    min: 0, 
    max: 100,
    default: 80 // Default 80% goes to winners
  },
  adminFeePercentage: { 
    type: Number, 
    required: true, 
    min: 0, 
    max: 100,
    default: 15 // Default 15% admin fee
  },
  minBetAmount: { 
    type: Number, 
    required: true, 
    min: 1,
    default: 10 // Default minimum bet ₹10
  },
  maxBetAmount: { 
    type: Number, 
    required: true, 
    min: 1,
    default: 10000 // Default maximum bet ₹10,000
  },
  updatedBy: { type: String, required: true },
}, { timestamps: true });

// Ensure percentages add up to 100% or less
commissionSettingsSchema.pre('save', function(next) {
  const total = this.agentCommissionPercentage + this.winnerPayoutPercentage + this.adminFeePercentage;
  if (total > 100) {
    return next(new Error('Total percentages cannot exceed 100%'));
  }
  next();
});

export const CommissionSettings = model<ICommissionSettings>('CommissionSettings', commissionSettingsSchema); 