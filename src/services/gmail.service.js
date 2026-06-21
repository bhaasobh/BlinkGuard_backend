import { google } from "googleapis";
import crypto from "crypto";

import GoogleAuth from "../models/GoogleAuth.js";

function decryptToken(enc) {
  const key = Buffer.from(
    process.env.TOKEN_ENC_KEY,
    "hex"
  );

  const raw = Buffer.from(enc, "base64");

  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const encrypted = raw.subarray(28);

  const decipher =
    crypto.createDecipheriv(
      "aes-256-gcm",
      key,
      iv
    );

  decipher.setAuthTag(tag);

  return (
    decipher.update(
      encrypted,
      undefined,
      "utf8"
    ) + decipher.final("utf8")
  );
}

export async function getLatestUnreadEmail(
  userId
) {

  const authData =
    await GoogleAuth.findOne({
      user_id: userId,
    });

  if (!authData) {
    throw new Error(
      "No Google account linked"
    );
  }

  const refreshToken =
    decryptToken(
      authData.refresh_token_enc
    );

  const oauth2Client =
    new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  });

  const gmail =
    google.gmail({
      version: "v1",
      auth: oauth2Client,
    });

  const list =
    await gmail.users.messages.list({
      userId: "me",
      q: "in:inbox is:unread",
      maxResults: 1,
    });

  const latestId =
    list.data.messages?.[0]?.id;

  if (!latestId) {
    return null;
  }

  const message =
    await gmail.users.messages.get({
      userId: "me",
      id: latestId,
    });

  const headers =
    message.data.payload?.headers || [];

  const subject =
    headers.find(
      h => h.name === "Subject"
    )?.value || "";

  const sender =
    headers.find(
      h => h.name === "From"
    )?.value || "";

  const snippet =
    message.data.snippet || "";

  return {
    id: latestId,
    sender,
    subject,
    snippet,
    content: `
${subject}
${snippet}
From: ${sender}
`,
  };
}