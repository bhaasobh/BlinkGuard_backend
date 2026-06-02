import express from "express";
import {
  getDashboardMessageById,
  getDashboardMessages,
  getDashboardScans,
  getDashboardSummary,
  getDashboardUsers
} from "../controllers/dashboard.controller.js";
import dashboardApiKey from "../middleware/dashboardApiKey.middleware.js";

const router = express.Router();
router.use(dashboardApiKey);

/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: Database monitoring endpoints
 */

/**
 * @swagger
 * /dashboard/summary:
 *   get:
 *     summary: Get dashboard totals and recent activity
 *     tags: [Dashboard]
 *     security:
 *       - DashboardApiKey: []
 *     responses:
 *       200:
 *         description: Dashboard summary
 *       401:
 *         description: Missing or invalid dashboard API key
 */
router.get("/summary", getDashboardSummary);

/**
 * @swagger
 * /dashboard/users:
 *   get:
 *     summary: List users with message counts
 *     tags: [Dashboard]
 *     security:
 *       - DashboardApiKey: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Paginated users
 *       401:
 *         description: Missing or invalid dashboard API key
 */
router.get("/users", getDashboardUsers);

/**
 * @swagger
 * /dashboard/messages:
 *   get:
 *     summary: List messages with scan data
 *     tags: [Dashboard]
 *     security:
 *       - DashboardApiKey: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: riskLevel
 *         schema:
 *           type: string
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *       - in: query
 *         name: sourceType
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Paginated messages
 *       401:
 *         description: Missing or invalid dashboard API key
 */
router.get("/messages", getDashboardMessages);

/**
 * @swagger
 * /dashboard/scans:
 *   get:
 *     summary: List scan results
 *     tags: [Dashboard]
 *     security:
 *       - DashboardApiKey: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: riskLevel
 *         schema:
 *           type: string
 *       - in: query
 *         name: scanType
 *         schema:
 *           type: string
 *       - in: query
 *         name: urlStatus
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Paginated scans
 *       401:
 *         description: Missing or invalid dashboard API key
 */
router.get("/scans", getDashboardScans);

/**
 * @swagger
 * /dashboard/messages/{messageId}:
 *   get:
 *     summary: Get one message by public message ID
 *     tags: [Dashboard]
 *     security:
 *       - DashboardApiKey: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Message with scan data
 *       404:
 *         description: Message not found
 *       401:
 *         description: Missing or invalid dashboard API key
 */
router.get("/messages/:messageId", getDashboardMessageById);

export default router;
