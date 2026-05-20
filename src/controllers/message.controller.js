import Message from "../models/Message.js";
import crypto from "crypto";
import { encryptMessageContent, serializeMessage } from "../utils/messageEncryption.js";
import ScanResult from "../models/ScanResult.js";

export const getMessages = async (req, res) => {
  try {
    const messages = await Message.find({ userId: req.user.userId })
      .populate("scanResult")
      .sort({ createdAt: -1 });

    res.json(messages.map(serializeMessage));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const createMessage = async (req, res) => {
  try {
    const { sourceType, content } = req.body;

    if (!sourceType || !content) {
      return res.status(400).json({ error: "sourceType and content are required" });
    }

    const message = await Message.create({
      messageId: crypto.randomUUID(),
      userId: req.user.userId,
      sourceType,
      ...encryptMessageContent(content)
    });

    res.status(201).json(serializeMessage(message));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};