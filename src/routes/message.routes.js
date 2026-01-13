import express from "express";
import auth from "../middleware/auth.middleware.js";
import { createMessage } from "../controllers/message.controller.js";

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
 *       description: Message record created in the system.
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
router.post("/", auth, createMessage);

export default router;
