const mongoose = require("mongoose");

const RISK_LEVELS = ["LOW", "MEDIUM", "HIGH"];
const SCAN_TYPES = ["TEXT", "URL", "IMAGE"];
const URL_STATUSES = ["SAFE", "SUSPICIOUS", "MALICIOUS"];

const ScanResultSchema = new mongoose.Schema(
  {
    scanId: { type: String, required: true, unique: true, index: true },
    messageId: { type: String, required: true, index: true },
    riskLevel: { type: String, required: true, trim: true, enum: RISK_LEVELS },
    scanType: { type: String, required: true, trim: true, enum: SCAN_TYPES },
    urlStatus: { type: String, trim: true, enum: URL_STATUSES },
    confidenceScore: { type: Number, min: 0, max: 1 },
    createdAt: { type: Date, default: Date.now },
    psychologyRiskScore: { type: Number, min: 0 },
    psychologicalFactors: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ScanResult", ScanResultSchema);
