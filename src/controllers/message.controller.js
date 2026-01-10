import Message from "../models/Message.js";
import crypto from "crypto";

export const createMessage = async (req, res) => {
  const { sourceType, content } = req.body;

  const hash = crypto
    .createHash("sha256")
    .update(content)
    .digest("hex");

  const message = await Message.create({
    userId: req.user.userId,
    sourceType,
    contentHash: hash
  });

  res.status(201).json(message);
};
