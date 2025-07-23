import { Request, Response } from 'express';
import { CommissionSettings } from '../models/commission.model';
import { AuthRequest } from '../middleware/auth';
import { z } from 'zod';

const updateCommissionSchema = z.object({
  agentCommissionPercentage: z.number().min(0).max(100),
  winnerPayoutPercentage: z.number().min(0).max(100),
  adminFeePercentage: z.number().min(0).max(100),
  minBetAmount: z.number().min(1),
  maxBetAmount: z.number().min(1),
});

export async function getCommissionSettings(req: Request, res: Response) {
  try {
    let settings = await CommissionSettings.findOne().sort({ createdAt: -1 });
    
    if (!settings) {
      // Create default settings if none exist
      settings = await CommissionSettings.create({
        agentCommissionPercentage: 5,
        winnerPayoutPercentage: 80,
        adminFeePercentage: 15,
        minBetAmount: 10,
        maxBetAmount: 10000,
        updatedBy: 'System',
      });
    }
    
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch commission settings' });
  }
}

export async function updateCommissionSettings(req: AuthRequest, res: Response) {
  try {
    const parse = updateCommissionSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: 'Invalid input data' });
    }
    
    const { agentCommissionPercentage, winnerPayoutPercentage, adminFeePercentage, minBetAmount, maxBetAmount } = parse.data;
    
    // Validate that percentages add up to 100% or less
    const totalPercentage = agentCommissionPercentage + winnerPayoutPercentage + adminFeePercentage;
    if (totalPercentage > 100) {
      return res.status(400).json({ error: 'Total percentages cannot exceed 100%' });
    }
    
    // Validate bet amounts
    if (minBetAmount >= maxBetAmount) {
      return res.status(400).json({ error: 'Minimum bet amount must be less than maximum bet amount' });
    }
    
    const adminName = req.user?.id ? `Admin (${req.user.id})` : 'Unknown Admin';
    
    const settings = await CommissionSettings.create({
      agentCommissionPercentage,
      winnerPayoutPercentage,
      adminFeePercentage,
      minBetAmount,
      maxBetAmount,
      updatedBy: adminName,
    });
    
    res.json({
      message: 'Commission settings updated successfully',
      settings
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update commission settings' });
  }
}

export async function getCommissionHistory(req: Request, res: Response) {
  try {
    const history = await CommissionSettings.find()
      .sort({ createdAt: -1 })
      .limit(20); // Get last 20 updates
    
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch commission history' });
  }
} 