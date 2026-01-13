import express from "express";
import auth from "../middleware/auth.middleware.js";
import {
  scanText,
  getScanResult
} from "../controllers/scan.controller.js";

/**
 * @swagger
 * tags:
 *   name: Scan
 *   description: Scanning operations
 * components:
 *   schemas:
 *     ScanTextRequest:
 *       type: object
 *       required:
 *         - messageId
 *       properties:
 *         messageId:
 *           type: string
 *           example: 66bbf3b61f0e7d3f2aa12345
 *     ScanResult:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: 66bbf3b61f0e7d3f2aa12345
 *         messageId:
 *           type: string
 *           example: 66bbf3b61f0e7d3f2aa67890
 *         riskLevel:
 *           type: string
 *           example: MEDIUM
 *         scanType:
 *           type: string
 *           example: AUTOMATED
 *         confidenceScore:
 *           type: number
 *           example: 0.62
 *         psychologyRiskScore:
 *           type: number
 *           example: 0.4
 *         psychologicalFactors:
 *           type: object
 *           example:
 *             urgency: true
 *             authorityPressure: false
 *     NotFoundResponse:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *           example: Not found
 */

const router = express.Router();

/**
 * @swagger
 * /scan/text:
 *   post:
 *     summary: Scan a message by ID
 *     tags: [Scan]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ScanTextRequest'
 *     responses:
 *       201:
 *         description: Scan result created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ScanResult'
 *       401:
 *         description: Missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnauthorizedResponse'
 */
router.post("/text", auth, scanText);

/**
 * @swagger
 * /scan/{scanId}:
 *   get:
 *     summary: Get a scan result by ID
 *     tags: [Scan]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: scanId
 *         required: true
 *         schema:
 *           type: string
 *         description: Scan result ID
 *     responses:
 *       200:
 *         description: Scan result
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ScanResult'
 *       401:
 *         description: Missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnauthorizedResponse'
 *       404:
 *         description: Scan result not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotFoundResponse'
 */
router.get("/:scanId", auth, getScanResult);

export default router;
