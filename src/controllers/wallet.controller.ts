import { Request, Response } from 'express';
import { Wallet } from '../models/wallet.model';
import { WalletTransaction } from '../models/wallet-transaction.model';
import { User } from '../models/user.model';
import { z } from 'zod';
import { Types } from 'mongoose';
import { AuthRequest } from '../middleware/auth';

const rechargeSchema = z.object({
  userId: z.string(),
  amount: z.number().min(1),
  walletType: z.enum(['main', 'bonus']),
  note: z.string().optional(),
});

export async function rechargeWallet(req: AuthRequest, res: Response) {
  const { id: initiatorId, role: initiatorRole } = req.user || {};
  if (!initiatorId || !initiatorRole) return res.status(401).json({ error: 'Unauthorized' });
  const parse = rechargeSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid input' });
  const { userId, amount, walletType, note } = parse.data;
  if (!Types.ObjectId.isValid(userId)) return res.status(400).json({ error: 'Invalid user id' });
  
  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  
  // Business rules based on initiator role
  if (initiatorRole === 'admin') {
    // Admin can recharge anyone without balance check
    if (user.role === 'agent' && amount < 1000) return res.status(400).json({ error: 'Min ₹1000 for agent' });
    if (user.role === 'user' && amount < 500) return res.status(400).json({ error: 'Min ₹500 for user' });
  } else if (initiatorRole === 'agent') {
    // Agent can only recharge their assigned users and needs sufficient balance
    if (user.role !== 'user') return res.status(403).json({ error: 'Agents can only recharge users' });
    if (user.assignedAgent?.toString() !== initiatorId) return res.status(403).json({ error: 'You can only recharge your assigned users' });
    if (amount < 500) return res.status(400).json({ error: 'Min ₹500 for user' });
    
    // Check agent's own wallet balance
    const agentWallet = await Wallet.findOne({ user: initiatorId });
    if (!agentWallet || agentWallet.main < amount) return res.status(400).json({ error: 'Insufficient agent balance' });
    
    // Deduct from agent's wallet
    agentWallet.main -= amount;
    await agentWallet.save();
    
    // Log agent debit
    await WalletTransaction.create({
      user: initiatorId,
      initiator: initiatorId,
      initiatorRole,
      amount,
      walletType: 'main',
      type: 'debit',
      note: `Recharge to user ${userId}`,
    });
  } else {
    return res.status(403).json({ error: 'Not allowed' });
  }
  
  // Credit to user/agent
  let wallet = await Wallet.findOne({ user: userId });
  if (!wallet) wallet = await Wallet.create({ user: userId });
  wallet[walletType] += amount;
  await wallet.save();
  
  // Log recharge
  await WalletTransaction.create({
    user: userId,
    initiator: initiatorId,
    initiatorRole,
    amount,
    walletType,
    type: 'recharge',
    note,
  });
  
  res.json({ message: 'Wallet recharged', balance: wallet });
}

export async function listWalletTransactions(req: AuthRequest, res: Response) {
  const { id: userId, role } = req.user || {};
  if (!userId || !role) return res.status(401).json({ error: 'Unauthorized' });
  let filter: any = {};
  
  if (role === 'user') {
    // Users can only see their own transactions
    filter.user = userId;
  } else if (role === 'agent') {
    // Agents can see their own transactions and their assigned users' transactions
    const { userId: targetUserId } = req.query;
    if (targetUserId && typeof targetUserId === 'string') {
      // Check if the target user is assigned to this agent
      const targetUser = await User.findById(targetUserId);
      if (!targetUser || targetUser.assignedAgent?.toString() !== userId) {
        return res.status(403).json({ error: 'You can only view transactions of your assigned users' });
      }
      filter.user = targetUserId;
    } else {
      // Show all transactions for users assigned to this agent
      const assignedUsers = await User.find({ assignedAgent: userId }).select('_id');
      const assignedUserIds = assignedUsers.map(u => u._id);
      filter.user = { $in: [...assignedUserIds, userId] }; // Include agent's own transactions
    }
  } else if (role === 'admin') {
    // Admin can filter by specific user or see all transactions
    const { userId: targetUserId } = req.query;
    if (targetUserId && typeof targetUserId === 'string') {
      filter.user = targetUserId;
    }
  }
  
  const txns = await WalletTransaction.find(filter).populate('user', 'fullName email gameId').sort({ createdAt: -1 }).limit(100);
  res.json(txns);
}

export async function listWallets(req: AuthRequest, res: Response) {
  const { id: userId, role } = req.user || {};
  if (!role || (role !== 'admin' && role !== 'agent')) return res.status(403).json({ error: 'Forbidden' });
  
  let wallets;
  if (role === 'admin') {
    // Admin can see all wallets
    wallets = await Wallet.find().populate('user', 'fullName email gameId role').sort({ updatedAt: -1 });
  } else {
    // Agent can only see wallets of their assigned users
    const assignedUsers = await User.find({ assignedAgent: userId }).select('_id');
    const assignedUserIds = assignedUsers.map(u => u._id);
    wallets = await Wallet.find({ user: { $in: assignedUserIds } }).populate('user', 'fullName email gameId role').sort({ updatedAt: -1 });
  }
  
  res.json(wallets);
} 

export async function manualDebit(req: AuthRequest, res: Response) {
  const { id: initiatorId, role: initiatorRole } = req.user || {};
  if (!initiatorId || !initiatorRole) return res.status(401).json({ error: 'Unauthorized' });
  
  // Only admins can perform manual debit
  if (initiatorRole !== 'admin') return res.status(403).json({ error: 'Only admins can perform manual debit' });
  
  const parse = rechargeSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid input' });
  const { userId, amount, walletType, note } = parse.data;
  if (!Types.ObjectId.isValid(userId)) return res.status(400).json({ error: 'Invalid user id' });
  
  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  
  // Check if user has sufficient balance
  let wallet = await Wallet.findOne({ user: userId });
  if (!wallet || wallet[walletType] < amount) return res.status(400).json({ error: 'Insufficient user balance' });
  
  // Debit from user's wallet
  wallet[walletType] -= amount;
  await wallet.save();
  
  // Log manual debit
  await WalletTransaction.create({
    user: userId,
    initiator: initiatorId,
    initiatorRole,
    amount,
    walletType,
    type: 'debit',
    note: note || 'Manual debit by admin',
  });
  
  res.json({ message: 'Manual debit successful', balance: wallet });
} 

export async function getMyWallet(req: AuthRequest, res: Response) {
  const { id: userId } = req.user || {};
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  
  try {
    let wallet = await Wallet.findOne({ user: userId });
    if (!wallet) {
      // Create wallet if it doesn't exist
      wallet = await Wallet.create({ user: userId });
    }
    
    // Populate user information
    await wallet.populate('user', 'fullName email gameId role');
    
    res.json(wallet);
  } catch (error) {
    console.error('Error fetching my wallet:', error);
    res.status(500).json({ error: 'Failed to fetch wallet' });
  }
} 