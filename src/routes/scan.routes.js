import express from "express";
import auth from "../middleware/auth.middleware.js";
const router = express.Router();

import {
  scanText,
  scanRawText,
  getScanResult,
  analyzeTxt,
  scanUrlController   
} from "../controllers/scan.controller.js";

router.get("/:scanId", auth, getScanResult);
router.post("/url", scanUrlController);

export default router;
