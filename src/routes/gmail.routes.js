import express from "express";

import auth from "../middleware/auth.middleware.js";

import {
  checkLatestGmail
} from "../controllers/gmail.controller.js";

const router =
  express.Router();

router.post(
  "/latest",
  auth,
  checkLatestGmail
);

export default router;