import { Request, Response } from 'express';
import { User } from '../models/user.model';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';

const loginSchema = z.object({
  identifier: z.string().min(1, 'Email or Game ID is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const userLoginSchema = z.object({
  identifier: z.string().min(1, 'Game ID is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export async function login(req: Request, res: Response) {
  const parse = loginSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid input' });
  const { identifier, password } = parse.data;

  const user = await User.findOne({
    $or: [
      { email: identifier.toLowerCase() },
      { gameId: identifier.toUpperCase() }
    ]
  });

  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  if (user.status !== 'active') return res.status(403).json({ error: 'Account not active' });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  // Only allow admin and agent roles to access the dashboard
  if (user.role !== 'admin' && user.role !== 'agent') {
    return res.status(403).json({ error: 'Access denied. Only admin and agent roles can access this dashboard.' });
  }

  const payload = {
    id: user._id,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
    gameId: user.gameId
  };
  const token = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '7d' });

  res.json({
    token,
    mustChangePassword: user.mustChangePassword,
    user: {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      gameId: user.gameId,
      role: user.role
    }
  });
}

export async function logout(_req: Request, res: Response) {
  // For JWT, logout is handled client-side by deleting the token
  res.json({ message: 'Logged out' });
}

const changePasswordSchema = z.object({
  oldPassword: z.string().min(6),
  newPassword: z.string().min(6),
});

export async function changePassword(req: AuthRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  const parse = changePasswordSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid input' });
  const { oldPassword, newPassword } = parse.data;
  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const valid = await bcrypt.compare(oldPassword, user.password);
  if (!valid) return res.status(401).json({ error: 'Old password incorrect' });
  user.password = await bcrypt.hash(newPassword, 10);
  user.mustChangePassword = false;
  await user.save();
  res.json({ message: 'Password changed' });
}

export async function validateToken(req: AuthRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Account not active' });
    }

    // Only allow admin and agent roles
    if (user.role !== 'admin' && user.role !== 'agent') {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({
      valid: true,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        gameId: user.gameId,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Token validation error:', error);
    res.status(500).json({ error: 'Token validation failed' });
  }
}

// User platform login - allows user role
export async function userLogin(req: Request, res: Response) {
  const parse = userLoginSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid input' });
  const { identifier, password } = parse.data;

  const user = await User.findOne({
    gameId: identifier.toUpperCase()
  });

  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  if (user.status !== 'active') return res.status(403).json({ error: 'Account not active' });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  // Only allow user role for user platform
  if (user.role !== 'user') {
    return res.status(403).json({ error: 'Access denied. Only user role can access this platform.' });
  }

  const payload = {
    id: user._id,
    role: user.role,
    gameId: user.gameId
  };
  const token = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '7d' });

  res.json({
    token,
    user: {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      gameId: user.gameId,
      role: user.role
    }
  });
}

// User platform token validation
export async function validateUserToken(req: AuthRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Account not active' });
    }

    // Only allow user role
    if (user.role !== 'user') {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({
      valid: true,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        gameId: user.gameId,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Token validation error:', error);
    res.status(500).json({ error: 'Token validation failed' });
  }
} 