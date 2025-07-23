import { Router } from 'express';
import { createNotification, listNotifications, updateNotification, deleteNotification, markAsRead } from '../controllers/notifications.controller';
import { jwtAuth } from '../middleware/auth';
import { requireRole } from '../middleware/roles';

const router = Router();

/**
 * @swagger
 * /api/notifications:
 *   post:
 *     summary: Create a new notification
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - message
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [info, alert, warning, success]
 *                 description: Type of notification
 *               message:
 *                 type: string
 *                 description: Notification message
 *               targetUser:
 *                 type: string
 *                 description: Target user ID (optional, for all users if not specified)
 *               targetAgent:
 *                 type: string
 *                 description: Target agent ID (optional, for all agents if not specified)
 *     responses:
 *       201:
 *         description: Notification created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin access required
 */
router.post('/', jwtAuth, requireRole('admin'), createNotification);

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: List all notifications
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of notifications
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                   type:
 *                     type: string
 *                   message:
 *                     type: string
 *                   targetUser:
 *                     type: string
 *                   targetAgent:
 *                     type: string
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *       401:
 *         description: Unauthorized
 */
router.get('/', jwtAuth, listNotifications);

/**
 * @swagger
 * /api/notifications/{id}:
 *   patch:
 *     summary: Update a notification
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Notification ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [info, alert, warning, success]
 *                 description: Type of notification
 *               message:
 *                 type: string
 *                 description: Notification message
 *               targetUser:
 *                 type: string
 *                 description: Target user ID
 *               targetAgent:
 *                 type: string
 *                 description: Target agent ID
 *     responses:
 *       200:
 *         description: Notification updated successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin access required
 *       404:
 *         description: Notification not found
 */
router.patch('/:id', jwtAuth, requireRole('admin'), updateNotification);

/**
 * @swagger
 * /api/notifications/{id}:
 *   delete:
 *     summary: Delete a notification
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Notification ID
 *     responses:
 *       200:
 *         description: Notification deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin access required
 *       404:
 *         description: Notification not found
 */
router.delete('/:id', jwtAuth, requireRole('admin'), deleteNotification);

/**
 * @swagger
 * /api/notifications/{id}/read:
 *   post:
 *     summary: Mark a notification as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Notification ID
 *     responses:
 *       200:
 *         description: Notification marked as read
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Notification not found
 */
router.post('/:id/read', jwtAuth, markAsRead);

export default router; 