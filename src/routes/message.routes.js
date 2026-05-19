import express from "express";
import auth from "../middleware/auth.middleware.js";
import { createMessage, getMessages } from "../controllers/message.controller.js";

/**
 * @swagger
 * tags:
 *   name: Messages
 *   description: Message ingestion
 * components:
 *   schemas:
 *     MessageCreateRequest:
 *       type: object
 *       required:
 *         - sourceType
 *         - content
 *       properties:
 *         sourceType:
 *           type: string
 *           example: sms
 *         content:
 *           type: string
 *           example: Your account will be locked unless you act now.
 *     MessageResponse:
 *       type: object
 *       properties:
 *         messageId:
 *           type: string
 *         userId:
 *           type: string
 *         sourceType:
 *           type: string
 *         content:
 *           type: string
 *           description: Decrypted message content.
 *         scanResult:
 *           allOf:
 *             - $ref: '#/components/schemas/ScanResult'
 *           nullable: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     UnauthorizedResponse:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *           example: Unauthorized
 */

const router = express.Router();

/**
 * @swagger
 * /messages:
 *   get:
 *     summary: Get messages for the authenticated user
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Messages for the authenticated user, newest first
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/MessageResponse'
 *       401:
 *         description: Missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnauthorizedResponse'
 *   post:
 *     summary: Create a message entry
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MessageCreateRequest'
 *     responses:
 *       201:
 *         description: Message created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 *       401:
 *         description: Missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnauthorizedResponse'
 */
router.get("/", auth, getMessages);
router.post("/", auth, createMessage);

export default router;
