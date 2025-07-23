import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Bid } from '../models/bid.model';
import { Game } from '../models/game.model';
import { Wallet } from '../models/wallet.model';
import { User } from '../models/user.model';
import { Counter } from '../models/counter.model';
import { z } from 'zod';
import { Types } from 'mongoose';

const placeBidSchema = z.object({
  gameId: z.string(),
  bidAmount: z.number().min(1),
});

async function getNextBidNumber(): Promise<number> {
  const counter = await Counter.findOneAndUpdate(
    { name: 'bidNumber' },
    { $inc: { sequence: 1 } },
    { new: true, upsert: true }
  );
  return counter.sequence;
}

export async function placeBid(req: AuthRequest, res: Response) {
  const { id: userId, role } = req.user || {};
  if (!userId || role !== 'user') return res.status(403).json({ error: 'Forbidden' });
  const parse = placeBidSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid input' });
  const { gameId, bidAmount } = parse.data;
  if (!Types.ObjectId.isValid(gameId)) return res.status(400).json({ error: 'Invalid game id' });
  const game = await Game.findById(gameId);
  if (!game || game.status !== 'open') return res.status(400).json({ error: 'Game not open for bids' });
  const wallet = await Wallet.findOne({ user: userId });
  if (!wallet || wallet.main < bidAmount) return res.status(400).json({ error: 'Insufficient balance' });
  
  // Auto-generate bid number
  const bidNumber = await getNextBidNumber();
  
  wallet.main -= bidAmount;
  await wallet.save();
  const bid = await Bid.create({ user: userId, game: gameId, bidNumber, bidAmount });
  game.totalPool += bidAmount;
  await game.save();
  res.status(201).json({ message: 'Bid placed', bid });
}

export async function listUserBids(req: AuthRequest, res: Response) {
  const { id: userId, role } = req.user || {};
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  let filter: any = {};
  if (role === 'user') filter.user = userId;
  if (role === 'agent') {
    // Find all users assigned to this agent
    const users = await User.find({ assignedAgent: userId }).select('_id');
    const userIds = users.map(u => u._id);
    filter.user = { $in: userIds };
  }
  // Admin can see all
  const bids = await Bid.find(filter)
    .populate('user', 'fullName email phone')
    .populate('game', 'timeWindow status totalPool')
    .sort({ createdAt: -1 })
    .limit(100);
  res.json(bids);
}

export async function listGameBids(req: AuthRequest, res: Response) {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  const { gameId } = req.params;
  if (!Types.ObjectId.isValid(gameId)) return res.status(400).json({ error: 'Invalid game id' });
  const bids = await Bid.find({ game: gameId })
    .populate('user', 'fullName email phone')
    .populate('game', 'timeWindow status totalPool')
    .sort({ createdAt: -1 });
  res.json(bids);
} 