import { Router } from 'express';
import {
  requestWithdrawal,
  listWithdrawals,
  approveWithdrawal,
  rejectWithdrawal,
  completeWithdrawal,
  manualDebit,
} from '../controllers/withdrawal.controller';
import { jwtAuth } from '../middleware/auth';
import { requireRole } from '../middleware/roles';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Withdrawals
 *   description: Withdrawal management
 */

/**
 * @swagger
 * /api/wallet/withdraw:
 *   post:
 *     summary: Request a withdrawal
 *     tags: [Withdrawals]
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount: { type: number }
 *               walletType: { type: string, enum: [main, bonus] }
 *               note: { type: string }
 *     responses:
 *       201: { description: Withdrawal requested }
 *       400: { description: Invalid input or insufficient balance }
 */
router.post('/withdraw', jwtAuth, requireRole('user'), requestWithdrawal);

/**
 * @swagger
 * /api/wallet/withdrawals:
 *   get:
 *     summary: List withdrawals
 *     tags: [Withdrawals]
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       200: { description: List of withdrawals }
 */
router.get('/withdrawals', jwtAuth, listWithdrawals);

/**
 * @swagger
 * /api/wallet/withdrawals/{id}/approve:
 *   patch:
 *     summary: Approve a withdrawal
 *     tags: [Withdrawals]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Withdrawal approved }
 *       404: { description: Withdrawal not found }
 */
router.patch('/withdrawals/:id/approve', jwtAuth, requireRole('admin', 'agent'), approveWithdrawal);

/**
 * @swagger
 * /api/wallet/withdrawals/{id}/reject:
 *   patch:
 *     summary: Reject a withdrawal
 *     tags: [Withdrawals]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Withdrawal rejected }
 *       404: { description: Withdrawal not found }
 */
router.patch('/withdrawals/:id/reject', jwtAuth, requireRole('admin', 'agent'), rejectWithdrawal);

/**
 * @swagger
 * /api/wallet/withdrawals/{id}/complete:
 *   patch:
 *     summary: Complete a withdrawal
 *     tags: [Withdrawals]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Withdrawal completed }
 *       404: { description: Withdrawal not found }
 */
router.patch('/withdrawals/:id/complete', jwtAuth, requireRole('admin', 'agent'), completeWithdrawal);

/**
 * @swagger
 * /api/wallet/manual-debit:
 *   post:
 *     summary: Manually debit a user's wallet
 *     tags: [Withdrawals]
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId: { type: string }
 *               amount: { type: number }
 *               walletType: { type: string, enum: [main, bonus] }
 *               note: { type: string }
 *     responses:
 *       200: { description: Manual debit successful }
 *       400: { description: Invalid input or insufficient balance }
 *       404: { description: User not found }
 */
router.post('/manual-debit', jwtAuth, requireRole('admin', 'agent'), manualDebit);

export default router; 