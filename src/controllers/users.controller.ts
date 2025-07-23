import { Request, Response } from 'express';
import { User, validatePhone, generateGameId } from '../models/user.model';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { Types } from 'mongoose';
import { AuthRequest } from '../middleware/auth';

const createUserSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Invalid email format'),
  phone: z.string().refine(validatePhone, 'Phone number must be a valid Indian mobile number'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  assignedAgent: z.string().optional(),
  role: z.enum(['user', 'agent']),
});

export async function createUser(req: AuthRequest, res: Response) {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'agent')) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  const parse = createUserSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid input', details: parse.error.issues });
  const { fullName, email, phone, password, assignedAgent, role } = parse.data;
  
  // Agents can only create users, not other agents
  if (req.user.role === 'agent' && role !== 'user') {
    return res.status(403).json({ error: 'Agents can only create users' });
  }
  
  // Check if user already exists
  const exists = await User.findOne({ $or: [{ email: email.toLowerCase() }, { phone }] });
  if (exists) return res.status(409).json({ error: 'Email or phone already exists' });
  
  // Generate gameId
  const gameId = generateGameId(fullName, phone);
  
  // Check if gameId already exists
  const existingGameId = await User.findOne({ gameId });
  if (existingGameId) return res.status(409).json({ error: 'Game ID already exists. Please try a different name or phone number.' });
  
  const hashed = await bcrypt.hash(password, 10);
  
  // Set assignedAgent based on who is creating the user
  const finalAssignedAgent = req.user.role === 'agent' ? req.user.id : (role === 'user' ? assignedAgent : null);
  
  const user = new User({
    fullName,
    email: email.toLowerCase(),
    phone,
    gameId,
    password: hashed,
    assignedAgent: finalAssignedAgent,
    role,
    status: 'active',
    createdBy: req.user.id,
    mustChangePassword: true,
  });
  await user.save();
  res.status(201).json({ 
    message: 'User created', 
    userId: user._id,
    gameId: user.gameId 
  });
}

export async function listUsers(req: AuthRequest, res: Response) {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'agent')) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  let users;
  if (req.user.role === 'admin') {
    // Admin can see all users
    users = await User.find().select('-password').sort({ createdAt: -1 });
  } else {
    // Agent can only see their assigned users
    users = await User.find({ assignedAgent: req.user.id }).select('-password').sort({ createdAt: -1 });
  }
  
  res.json(users);
}

const updateUserSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').optional(),
  phone: z.string().refine(validatePhone, 'Phone number must be a valid Indian mobile number').optional(),
  status: z.enum(['active', 'disabled', 'banned']).optional(),
  assignedAgent: z.string().optional().nullable(),
});

export async function updateUser(req: AuthRequest, res: Response) {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'agent')) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid user id' });
  
  // Check if agent is trying to update a user they don't own
  if (req.user.role === 'agent') {
    const userToUpdate = await User.findById(id);
    if (!userToUpdate || userToUpdate.assignedAgent?.toString() !== req.user.id) {
      return res.status(403).json({ error: 'You can only update your assigned users' });
    }
  }
  
  const parse = updateUserSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid input', details: parse.error.issues });
  const update: any = { ...parse.data };
  if (update.assignedAgent === undefined) delete update.assignedAgent;
  
  // If phone is being updated, check for duplicates and regenerate gameId
  if (update.phone) {
    const existingUser = await User.findOne({ phone: update.phone, _id: { $ne: id } });
    if (existingUser) return res.status(409).json({ error: 'Phone number already exists' });
    
    // Get current user to regenerate gameId
    const currentUser = await User.findById(id);
    if (currentUser) {
      const newGameId = generateGameId(update.fullName || currentUser.fullName, update.phone);
      const existingGameId = await User.findOne({ gameId: newGameId, _id: { $ne: id } });
      if (existingGameId) return res.status(409).json({ error: 'Game ID already exists. Please try a different name or phone number.' });
      update.gameId = newGameId;
    }
  }
  
  const user = await User.findByIdAndUpdate(id, update, { new: true }).select('-password');
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
}

export async function disableUser(req: AuthRequest, res: Response) {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'agent')) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid user id' });
  
  // Check if agent is trying to disable a user they don't own
  if (req.user.role === 'agent') {
    const userToDisable = await User.findById(id);
    if (!userToDisable || userToDisable.assignedAgent?.toString() !== req.user.id) {
      return res.status(403).json({ error: 'You can only disable your assigned users' });
    }
  }
  
  const user = await User.findByIdAndUpdate(id, { status: 'disabled' }, { new: true }).select('-password');
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ message: 'User disabled', user });
}

export async function banUser(req: AuthRequest, res: Response) {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'agent')) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid user id' });
  
  // Check if agent is trying to ban a user they don't own
  if (req.user.role === 'agent') {
    const userToBan = await User.findById(id);
    if (!userToBan || userToBan.assignedAgent?.toString() !== req.user.id) {
      return res.status(403).json({ error: 'You can only ban your assigned users' });
    }
  }
  
  const user = await User.findByIdAndUpdate(id, { status: 'banned' }, { new: true }).select('-password');
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ message: 'User banned', user });
}

export async function activateUser(req: AuthRequest, res: Response) {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'agent')) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid user id' });
  
  // Check if agent is trying to activate a user they don't own
  if (req.user.role === 'agent') {
    const userToActivate = await User.findById(id);
    if (!userToActivate || userToActivate.assignedAgent?.toString() !== req.user.id) {
      return res.status(403).json({ error: 'You can only activate your assigned users' });
    }
  }
  
  const user = await User.findByIdAndUpdate(id, { status: 'active' }, { new: true }).select('-password');
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ message: 'User activated', user });
}

export async function deleteUser(req: AuthRequest, res: Response) {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'agent')) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid user id' });
  
  // Check if agent is trying to delete a user they don't own
  if (req.user.role === 'agent') {
    const userToDelete = await User.findById(id);
    if (!userToDelete || userToDelete.assignedAgent?.toString() !== req.user.id) {
      return res.status(403).json({ error: 'You can only delete your assigned users' });
    }
  }
  
  const user = await User.findByIdAndDelete(id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ message: 'User deleted', user });
} 