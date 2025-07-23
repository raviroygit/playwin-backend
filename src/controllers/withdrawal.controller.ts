import { Request, Response } from 'express';
import { Withdrawal } from '../models/withdrawal.model';
import { Wallet } from '../models/wallet.model';
import { WalletTransaction } from '../models/wallet-transaction.model';
import { User } from '../models/user.model';
import { z } from 'zod';
import { Types } from 'mongoose';
import { AuthRequest } from '../middleware/auth';

const requestSchema = z.object({
  amount: z.number().min(1),
  walletType: z.enum(['main', 'bonus']),
  note: z.string().optional(),
});

export async function requestWithdrawal(req: AuthRequest, res: Response) {
  const { id: userId, role } = req.user || {};
  if (!userId || role !== 'user') return res.status(403).json({ error: 'Forbidden' });
  const parse = requestSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid input' });
  const { amount, walletType, note } = parse.data;
  const wallet = await Wallet.findOne({ user: userId });
  if (!wallet || wallet[walletType] < amount) return res.status(400).json({ error: 'Insufficient balance' });
  wallet[walletType] -= amount;
  await wallet.save();
  const withdrawal = await Withdrawal.create({ user: userId, amount, walletType, note });
  await WalletTransaction.create({
    user: userId,
    initiator: userId,
    initiatorRole: 'user',
    amount,
    walletType,
    type: 'debit',
    note: note || 'Withdrawal request',
  });
  res.status(201).json(withdrawal);
}

export async function listWithdrawals(req: AuthRequest, res: Response) {
  const { id: userId, role } = req.user || {};
  let filter: any = {};
  if (role === 'user') filter.user = userId;
  if (role === 'agent') {
    // List withdrawals for assigned users (optional: implement agent-user mapping)
    filter = { }; // TODO: filter by agent's users
  }
  // Admin sees all
  const withdrawals = await Withdrawal.find(filter).sort({ createdAt: -1 }).limit(100);
  res.json(withdrawals);
}

export async function approveWithdrawal(req: AuthRequest, res: Response) {
  const { id: adminId, role } = req.user || {};
  if (!adminId || (role !== 'admin' && role !== 'agent')) return res.status(403).json({ error: 'Forbidden' });
  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid withdrawal id' });
  const withdrawal = await Withdrawal.findByIdAndUpdate(id, { status: 'approved', processedBy: adminId }, { new: true });
  if (!withdrawal) return res.status(404).json({ error: 'Withdrawal not found' });
  res.json(withdrawal);
}

export async function rejectWithdrawal(req: AuthRequest, res: Response) {
  const { id: adminId, role } = req.user || {};
  if (!adminId || (role !== 'admin' && role !== 'agent')) return res.status(403).json({ error: 'Forbidden' });
  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid withdrawal id' });
  const withdrawal = await Withdrawal.findByIdAndUpdate(id, { status: 'rejected', processedBy: adminId }, { new: true });
  if (!withdrawal) return res.status(404).json({ error: 'Withdrawal not found' });
  // Refund to user
  const wallet = await Wallet.findOne({ user: withdrawal.user });
  if (wallet) {
    wallet[withdrawal.walletType] += withdrawal.amount;
    await wallet.save();
  }
  res.json(withdrawal);
}

export async function completeWithdrawal(req: AuthRequest, res: Response) {
  const { id: adminId, role } = req.user || {};
  if (!adminId || (role !== 'admin' && role !== 'agent')) return res.status(403).json({ error: 'Forbidden' });
  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid withdrawal id' });
  const withdrawal = await Withdrawal.findByIdAndUpdate(id, { status: 'completed', processedBy: adminId }, { new: true });
  if (!withdrawal) return res.status(404).json({ error: 'Withdrawal not found' });
  res.json(withdrawal);
}

const manualDebitSchema = z.object({
  userId: z.string(),
  amount: z.number().min(1),
  walletType: z.enum(['main', 'bonus']),
  note: z.string().optional(),
});

export async function manualDebit(req: AuthRequest, res: Response) {
  const { id: initiatorId, role: initiatorRole } = req.user || {};
  if (!initiatorId || (initiatorRole !== 'admin' && initiatorRole !== 'agent')) return res.status(403).json({ error: 'Forbidden' });
  const parse = manualDebitSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid input' });
  const { userId, amount, walletType, note } = parse.data;
  if (!Types.ObjectId.isValid(userId)) return res.status(400).json({ error: 'Invalid user id' });
  const wallet = await Wallet.findOne({ user: userId });
  if (!wallet || wallet[walletType] < amount) return res.status(400).json({ error: 'Insufficient balance' });
  wallet[walletType] -= amount;
  await wallet.save();
  await WalletTransaction.create({
    user: userId,
    initiator: initiatorId,
    initiatorRole,
    amount,
    walletType,
    type: 'debit',
    note: note || 'Manual debit',
  });
  res.json({ message: 'Manual debit successful', balance: wallet });
} 