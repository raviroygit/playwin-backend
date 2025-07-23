import { Request, Response } from 'express';
import { Game } from '../models/game.model';
import { ManualOverride } from '../models/manual-override.model';
import { Bid } from '../models/bid.model';
import { Wallet } from '../models/wallet.model';
import { CommissionSettings } from '../models/commission.model';
import { User } from '../models/user.model';
import { z } from 'zod';
import { Types } from 'mongoose';
import { AuthRequest } from '../middleware/auth';

const createGameSchema = z.object({
  timeWindow: z.string(),
});

export async function createGame(req: AuthRequest, res: Response) {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  const parse = createGameSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid input' });
  const { timeWindow } = parse.data;
  const exists = await Game.findOne({ timeWindow });
  if (exists) return res.status(409).json({ error: 'Game already exists for this window' });
  const game = await Game.create({ timeWindow, status: 'open', totalPool: 0 });
  res.status(201).json(game);
}

export async function listGames(req: AuthRequest, res: Response) {
  const { status } = req.query;
  const filter: any = {};
  if (status) filter.status = status;
  const games = await Game.find(filter).sort({ createdAt: -1 }).limit(100);
  res.json(games);
}

export async function getGame(req: AuthRequest, res: Response) {
  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid game id' });
  const game = await Game.findById(id);
  if (!game) return res.status(404).json({ error: 'Game not found' });
  res.json(game);
}

const overrideSchema = z.object({
  gameId: z.string(),
  winnerNumber: z.number().min(1).max(12),
  manualWinners: z.array(z.string()),
  note: z.string().optional(),
  payoutMultiplier: z.number().optional(),
});

export async function overrideResult(req: AuthRequest, res: Response) {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  const parse = overrideSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid input' });
  const { gameId, winnerNumber, manualWinners, note, payoutMultiplier } = parse.data;
  if (!Types.ObjectId.isValid(gameId)) return res.status(400).json({ error: 'Invalid game id' });
  const game = await Game.findById(gameId);
  if (!game) return res.status(404).json({ error: 'Game not found' });
  
  // Find all bids for this game with the winning number
  const winningBids = await Bid.find({ 
    game: gameId, 
    bidNumber: winnerNumber 
  }).populate<{ user: { _id: Types.ObjectId; fullName: string; email: string } }>('user', 'fullName email');
  
  // Calculate payout per winner
  const totalWinners = winningBids.length;
  const payoutPerWinner = totalWinners > 0 ? Math.floor(game.totalPool / totalWinners) : 0;
  const remainingAmount = totalWinners > 0 ? game.totalPool % totalWinners : game.totalPool;
  
  // Credit wallets for all winners
  const winnerUpdates = [];
  for (const bid of winningBids) {
    const wallet = await Wallet.findOne({ user: bid.user._id });
    if (wallet) {
      wallet.main += payoutPerWinner;
      await wallet.save();
      winnerUpdates.push({
        userId: bid.user._id,
        userName: (bid.user as any).fullName,
        bidAmount: bid.bidAmount,
        payoutAmount: payoutPerWinner
      });
    }
  }
  
  // Update game result
  game.resultNumber = winnerNumber;
  game.status = 'result';
  await game.save();
  
  // Log manual override
  const override = await ManualOverride.create({
    game: gameId,
    winnerNumber,
    manualWinners,
    note: note || `Manual override. ${totalWinners} winners. Payout: ₹${payoutPerWinner} each.`,
    payoutMultiplier,
  });
  
  res.json({ 
    message: 'Result overridden', 
    override,
    winners: {
      count: totalWinners,
      payoutPerWinner,
      remainingAmount,
      winnerDetails: winnerUpdates
    }
  });
}

const declareWinnerSchema = z.object({
  winnerNumber: z.number().min(1).max(12),
});

export async function declareWinner(req: AuthRequest, res: Response) {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid game id' });
  
  const parse = declareWinnerSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid input' });
  
  const { winnerNumber } = parse.data;
  const game = await Game.findById(id);
  if (!game) return res.status(404).json({ error: 'Game not found' });
  
  if (game.status !== 'open') {
    return res.status(400).json({ error: 'Can only declare winner for open games' });
  }
  
  // Get commission settings
  const commissionSettings = await CommissionSettings.findOne().sort({ createdAt: -1 });
  if (!commissionSettings) {
    return res.status(500).json({ error: 'Commission settings not found' });
  }
  
  // Find all bids for this game with the winning number
  const winningBids = await Bid.find({ 
    game: id, 
    bidNumber: winnerNumber 
  }).populate<{ user: { _id: Types.ObjectId; fullName: string; email: string; assignedAgent?: Types.ObjectId } }>('user', 'fullName email assignedAgent');
  
  // Calculate commission and payout amounts
  const totalPool = game.totalPool;
  const agentCommissionAmount = Math.floor((totalPool * commissionSettings.agentCommissionPercentage) / 100);
  const winnerPayoutAmount = Math.floor((totalPool * commissionSettings.winnerPayoutPercentage) / 100);
  const adminFeeAmount = totalPool - agentCommissionAmount - winnerPayoutAmount;
  
  // Calculate payout per winner
  const totalWinners = winningBids.length;
  const payoutPerWinner = totalWinners > 0 ? Math.floor(winnerPayoutAmount / totalWinners) : 0;
  const remainingAmount = totalWinners > 0 ? winnerPayoutAmount % totalWinners : winnerPayoutAmount;
  
  // Track agent commissions
  const agentCommissions = new Map<string, number>();
  
  // Credit wallets for all winners and calculate agent commissions
  const winnerUpdates = [];
  for (const bid of winningBids) {
    const user = bid.user as any;
    const wallet = await Wallet.findOne({ user: user._id });
    if (wallet) {
      wallet.main += payoutPerWinner;
      await wallet.save();
      winnerUpdates.push({
        userId: user._id,
        userName: user.fullName,
        bidAmount: bid.bidAmount,
        payoutAmount: payoutPerWinner
      });
      
      // Calculate agent commission for this winner
      if (user.assignedAgent) {
        const agentId = user.assignedAgent.toString();
        const currentCommission = agentCommissions.get(agentId) || 0;
        const winnerCommission = Math.floor((payoutPerWinner * commissionSettings.agentCommissionPercentage) / 100);
        agentCommissions.set(agentId, currentCommission + winnerCommission);
      }
    }
  }
  
  // Credit agent commissions
  const agentCommissionDetails = [];
  for (const [agentId, commissionAmount] of agentCommissions) {
    const agentWallet = await Wallet.findOne({ user: agentId });
    if (agentWallet && commissionAmount > 0) {
      agentWallet.main += commissionAmount;
      await agentWallet.save();
      
      const agent = await User.findById(agentId);
      agentCommissionDetails.push({
        agentId,
        agentName: agent?.fullName || 'Unknown Agent',
        commissionAmount
      });
    }
  }
  
  // Update game result
  game.resultNumber = winnerNumber;
  game.status = 'result';
  await game.save();
  
  // Log manual override with commission details
  await ManualOverride.create({
    game: id,
    winnerNumber,
    manualWinners: [],
    note: `Winner declared by admin. ${totalWinners} winners. Payout: ₹${payoutPerWinner} each. Agent commission: ₹${agentCommissionAmount} total.`,
    payoutMultiplier: 1,
  });
  
  res.json({ 
    message: 'Winner declared successfully', 
    game,
    commission: {
      totalPool,
      agentCommissionAmount,
      winnerPayoutAmount,
      adminFeeAmount,
      agentCommissionDetails
    },
    winners: {
      count: totalWinners,
      payoutPerWinner,
      remainingAmount,
      winnerDetails: winnerUpdates
    }
  });
} 