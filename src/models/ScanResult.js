import mongoose from "mongoose";

const RISK_LEVELS = ["LOW", "MEDIUM", "HIGH"];
const SCAN_TYPES = ["TEXT", "URL", "IMAGE", "AUTOMATED"];
const URL_STATUSES = ["SAFE", "SUSPICIOUS", "MALICIOUS"];

const ScanResultSchema = new mongoose.Schema(
  {
    scanId: { type: String, required: true, unique: true, index: true },
    messageId: { type: String, required: true, index: true },
    riskLevel: { type: String, required: true, trim: true, enum: RISK_LEVELS },
    scanType: { type: String, required: true, trim: true, enum: SCAN_TYPES },
    urlStatus: { type: String, trim: true, enum: URL_STATUSES },
    confidenceScore: { type: Number, min: 0, max: 1 },
    psychologyRiskScore: { type: Number, min: 0, max: 1 },
    mlRiskScore: { type: Number, min: 0, max: 1 },
    psychologicalFactors: { type: mongoose.Schema.Types.Mixed },
    mlPrediction: { type: String, trim: true },
    decision: { type: String, trim: true },
    analysisVersion: { type: String, trim: true },
    explanations: [{ type: String }],
    rawModelOutput: { type: mongoose.Schema.Types.Mixed }
  },
  { timestamps: true }
);

export default mongoose.model("ScanResult", ScanResultSchema);