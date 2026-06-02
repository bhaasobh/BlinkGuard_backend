import crypto from "crypto";

const safeCompare = (receivedKey, expectedKey) => {
  const received = Buffer.from(receivedKey);
  const expected = Buffer.from(expectedKey);

  if (received.length !== expected.length) {
    return false;
  }

  return crypto.timingSafeEqual(received, expected);
};

export default function dashboardApiKey(req, res, next) {
  const expectedKey = process.env.DASHBOARD_API_KEY;

  if (!expectedKey) {
    return res.status(500).json({ error: "Dashboard API key is not configured" });
  }

  const receivedKey = req.get("x-dashboard-api-key");

  if (!receivedKey || !safeCompare(receivedKey, expectedKey)) {
    return res.status(401).json({ error: "Invalid dashboard API key" });
  }

  next();
}
