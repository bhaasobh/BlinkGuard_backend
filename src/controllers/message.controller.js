import Message from "../models/Message.js";
import crypto from "crypto";

export const getMessages = async (req, res) => {
  try {
    const messages = await Message.find({ userId: req.user.userId })
      .sort({ createdAt: -1 });

    res.json(messages);
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

    const hash = crypto.createHash("sha256").update(content).digest("hex");

    const message = await Message.create({
      messageId: crypto.randomUUID(),
      userId: req.user.userId,
      sourceType,
      contentHash: hash
    });

    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
