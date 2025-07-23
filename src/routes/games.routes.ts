import { Router } from 'express';
import { createGame, listGames, getGame, overrideResult, declareWinner } from '../controllers/games.controller';
import { jwtAuth } from '../middleware/auth';
import { requireRole } from '../middleware/roles';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Games
 *   description: Game management
 */

/**
 * @swagger
 * /api/games:
 *   post:
 *     summary: Create a new game
 *     tags: [Games]
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               timeWindow: { type: string }
 *     responses:
 *       201: { description: Game created }
 *       400: { description: Invalid input }
 *       409: { description: Game already exists for this window }
 */
router.post('/', jwtAuth, requireRole('admin'), createGame);

/**
 * @swagger
 * /api/games:
 *   get:
 *     summary: List games
 *     tags: [Games]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *     responses:
 *       200: { description: List of games }
 */
router.get('/', jwtAuth, listGames);

/**
 * @swagger
 * /api/games/{id}:
 *   get:
 *     summary: Get a game by ID
 *     tags: [Games]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Game details }
 *       404: { description: Game not found }
 */
router.get('/:id', jwtAuth, getGame);

/**
 * @swagger
 * /api/games/override:
 *   post:
 *     summary: Override game result
 *     tags: [Games]
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               gameId: { type: string }
 *               winnerNumber: { type: number }
 *               manualWinners: { type: array, items: { type: string } }
 *               note: { type: string }
 *               payoutMultiplier: { type: number }
 *     responses:
 *       200: { description: Result overridden }
 *       400: { description: Invalid input }
 *       404: { description: Game not found }
 */
router.post('/override', jwtAuth, requireRole('admin'), overrideResult);

/**
 * @swagger
 * /api/games/{id}/declare-winner:
 *   post:
 *     summary: Declare winner for a running game
 *     tags: [Games]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               winnerNumber: { type: number, minimum: 1, maximum: 12 }
 *     responses:
 *       200: { description: Winner declared successfully }
 *       400: { description: Invalid input or game not open }
 *       404: { description: Game not found }
 */
router.post('/:id/declare-winner', jwtAuth, requireRole('admin'), declareWinner);

export default router; 