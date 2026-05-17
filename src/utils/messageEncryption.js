import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

const getMessageEncryptionKey = () => {
  const keyHex = process.env.MESSAGE_ENC_KEY || process.env.TOKEN_ENC_KEY;

  if (!keyHex) {
    throw new Error("MESSAGE_ENC_KEY or TOKEN_ENC_KEY is required");
  }

  const key = Buffer.from(keyHex.replace(/^"|"$/g, ""), "hex");

  if (key.length !== 32) {
    throw new Error("MESSAGE_ENC_KEY or TOKEN_ENC_KEY must be a 64-character hex string");
  }

  return key;
};

export const encryptMessageContent = (content) => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getMessageEncryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(content, "utf8"),
    cipher.final()
  ]);

  return {
    content: encrypted.toString("base64"),
    contentIv: iv.toString("base64"),
    contentAuthTag: cipher.getAuthTag().toString("base64")
  };
};

export const decryptMessageContent = (message) => {
  if (!message?.content) return "";

  if (!message.contentIv || !message.contentAuthTag) {
    return message.content;
  }

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    getMessageEncryptionKey(),
    Buffer.from(message.contentIv, "base64")
  );

  decipher.setAuthTag(Buffer.from(message.contentAuthTag, "base64"));

  return Buffer.concat([
    decipher.update(Buffer.from(message.content, "base64")),
    decipher.final()
  ]).toString("utf8");
};

export const serializeMessage = (message) => {
  const data = message.toObject ? message.toObject() : { ...message };

  data.content = decryptMessageContent(data);
  delete data.contentIv;
  delete data.contentAuthTag;

  return data;
};
