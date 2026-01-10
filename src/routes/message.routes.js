import express from "express";
import auth from "../middleware/auth.middleware.js";
import { createMessage } from "../controllers/message.controller.js";

const router = express.Router();

router.post("/", auth, createMessage);

export default router;
