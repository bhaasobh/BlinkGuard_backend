import express from "express";
import multer from "multer";
import auth from "../middleware/auth.middleware.js";
import {
  scanText,
  scanRawText,
  getScanResult,
  analyzeTxt,
  scanImage,
  scanUrlController
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
const IMAGE_MAX_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/bmp",
  "image/tiff"
]);

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 1,
    fileSize: IMAGE_MAX_SIZE_BYTES
  },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
      return cb(new Error("Unsupported image type"));
    }

    return cb(null, true);
  }
}).single("image");

const handleImageUpload = (req, res, next) => {
  imageUpload(req, res, (err) => {
    if (!err) return next();

    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ error: "Image file is too large" });
      }

      return res.status(400).json({ error: err.message });
    }

    return res.status(400).json({ error: err.message });
  });
};

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

router.get("/:scanId", auth, getScanResult);
router.post("/url", scanUrlController);

router.post("/raw", auth, scanRawText);
router.post("/rawtxt", auth, analyzeTxt);
/**
 * @swagger
 * /scan/image:
 *   post:
 *     summary: Extract text from an image and scan it
 *     tags: [Scan]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: OCR text and scan result
 *       400:
 *         description: Missing, invalid, oversized, or unreadable image
 *       401:
 *         description: Missing or invalid token
 */
router.post("/image", auth, handleImageUpload, scanImage);
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

export default router;

