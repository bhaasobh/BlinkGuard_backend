import express from "express";
import auth from "../middleware/auth.middleware.js";
import {
  scanText,
  getScanResult
} from "../controllers/scan.controller.js";

const router = express.Router();

router.post("/text", auth, scanText);
router.get("/:scanId", auth, getScanResult);

export default router;
