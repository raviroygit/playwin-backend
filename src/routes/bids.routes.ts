import { Router } from 'express';
import { placeBid, listUserBids, listGameBids } from '../controllers/bids.controller';
import { jwtAuth } from '../middleware/auth';
import { requireRole } from '../middleware/roles';

const router = Router();

/**
 * @swagger
 * /api/bids:
 *   post:
 *     summary: Place a bid on a game
 *     tags: [Bids]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - gameId
 *               - bidAmount
 *             properties:
 *               gameId:
 *                 type: string
 *                 description: ID of the game to bid on
 *               bidAmount:
 *                 type: number
 *                 minimum: 1
 *                 description: Amount to bid
 *     responses:
 *       201:
 *         description: Bid placed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 bid:
 *                   type: object
 *       400:
 *         description: Invalid input or game not open
 *       403:
 *         description: Forbidden - user role not allowed
 *       401:
 *         description: Unauthorized
 */
router.post('/', jwtAuth, requireRole('user'), placeBid);

/**
 * @swagger
 * /api/bids:
 *   get:
 *     summary: List user bids
 *     tags: [Bids]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of bids
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                   user:
 *                     type: string
 *                   game:
 *                     type: string
 *                   bidNumber:
 *                     type: number
 *                   bidAmount:
 *                     type: number
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *       401:
 *         description: Unauthorized
 */
router.get('/', jwtAuth, listUserBids);

/**
 * @swagger
 * /api/bids/game/{gameId}:
 *   get:
 *     summary: List all bids for a specific game (Admin only)
 *     tags: [Bids]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: gameId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the game
 *     responses:
 *       200:
 *         description: List of bids for the game
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                   user:
 *                     type: string
 *                   game:
 *                     type: string
 *                   bidNumber:
 *                     type: number
 *                   bidAmount:
 *                     type: number
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *       400:
 *         description: Invalid game ID
 *       403:
 *         description: Forbidden - admin access required
 *       401:
 *         description: Unauthorized
 */
router.get('/game/:gameId', jwtAuth, requireRole('admin'), listGameBids);

export default router; 