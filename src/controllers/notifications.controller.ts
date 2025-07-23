import { Request, Response } from 'express';
import { Notification } from '../models/notification.model';
import { z } from 'zod';
import { Types } from 'mongoose';
import { AuthRequest } from '../middleware/auth';

const createSchema = z.object({
  type: z.enum(['global', 'user', 'agent']),
  message: z.string().min(1),
  targetUser: z.string().optional(),
  targetAgent: z.string().optional(),
});

export async function createNotification(req: AuthRequest, res: Response) {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  const parse = createSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid input' });
  
  // Convert empty strings to undefined for ObjectId fields
  const notificationData = {
    ...parse.data,
    targetUser: parse.data.targetUser && parse.data.targetUser.trim() !== '' ? parse.data.targetUser : undefined,
    targetAgent: parse.data.targetAgent && parse.data.targetAgent.trim() !== '' ? parse.data.targetAgent : undefined,
  };
  
  const notif = await Notification.create(notificationData);
  res.status(201).json(notif);
}

export async function listNotifications(req: AuthRequest, res: Response) {
  const { id, role } = req.user || {};
  let filter: any = {};
  if (role === 'user') filter = { $or: [ { type: 'global' }, { type: 'user', targetUser: id } ] };
  else if (role === 'agent') filter = { $or: [ { type: 'global' }, { type: 'agent', targetAgent: id } ] };
  // Admin sees all
  const notifs = await Notification.find(filter).sort({ createdAt: -1 }).limit(100);
  res.json(notifs);
}

const updateSchema = z.object({
  message: z.string().min(1).optional(),
});

export async function updateNotification(req: AuthRequest, res: Response) {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid notification id' });
  const parse = updateSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid input' });
  const notif = await Notification.findByIdAndUpdate(id, parse.data, { new: true });
  if (!notif) return res.status(404).json({ error: 'Notification not found' });
  res.json(notif);
}

export async function deleteNotification(req: AuthRequest, res: Response) {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid notification id' });
  await Notification.findByIdAndDelete(id);
  res.json({ message: 'Notification deleted' });
}

// Mark as read: for user/agent, just a stub (extend model if you want to track read status)
export async function markAsRead(req: AuthRequest, res: Response) {
  res.json({ message: 'Marked as read (not persisted)' });
} 