import { Router } from 'express';
import { getCommissionSettings, updateCommissionSettings, getCommissionHistory } from '../controllers/commission.controller';
import { jwtAuth } from '../middleware/auth';
import { requireRole } from '../middleware/roles';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Commission
 *   description: Commission settings management
 */

/**
 * @swagger
 * /api/commission/settings:
 *   get:
 *     summary: Get current commission settings
 *     tags: [Commission]
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       200:
 *         description: Current commission settings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 agentCommissionPercentage: { type: number }
 *                 winnerPayoutPercentage: { type: number }
 *                 adminFeePercentage: { type: number }
 *                 minBetAmount: { type: number }
 *                 maxBetAmount: { type: number }
 *                 updatedBy: { type: string }
 *                 updatedAt: { type: string }
 */
router.get('/settings', jwtAuth, getCommissionSettings);

/**
 * @swagger
 * /api/commission/settings:
 *   post:
 *     summary: Update commission settings (admin only)
 *     tags: [Commission]
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               agentCommissionPercentage: { type: number, minimum: 0, maximum: 100 }
 *               winnerPayoutPercentage: { type: number, minimum: 0, maximum: 100 }
 *               adminFeePercentage: { type: number, minimum: 0, maximum: 100 }
 *               minBetAmount: { type: number, minimum: 1 }
 *               maxBetAmount: { type: number, minimum: 1 }
 *     responses:
 *       200:
 *         description: Commission settings updated successfully
 *       400:
 *         description: Invalid input or validation error
 *       403:
 *         description: Access denied - admin only
 */
router.post('/settings', jwtAuth, requireRole('admin'), updateCommissionSettings);

/**
 * @swagger
 * /api/commission/history:
 *   get:
 *     summary: Get commission settings history (admin only)
 *     tags: [Commission]
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       200:
 *         description: Commission settings history
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   agentCommissionPercentage: { type: number }
 *                   winnerPayoutPercentage: { type: number }
 *                   adminFeePercentage: { type: number }
 *                   minBetAmount: { type: number }
 *                   maxBetAmount: { type: number }
 *                   updatedBy: { type: string }
 *                   updatedAt: { type: string }
 *       403:
 *         description: Access denied - admin only
 */
router.get('/history', jwtAuth, requireRole('admin'), getCommissionHistory);

export default router; 