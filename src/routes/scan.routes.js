import express from "express";
import auth from "../middleware/auth.middleware.js";
import {
  scanText,
  scanRawText,
  getScanResult,
  analyzeTxt
} from "../controllers/scan.controller.js";

router.get("/:scanId", auth, getScanResult);
router.post("/url", scanUrlController);

export default router;
