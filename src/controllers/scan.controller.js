import crypto from "crypto";
import Message from "../models/Message.js";
import ScanResult from "../models/ScanResult.js";
import { analyzeMessage } from "../services/ai/ai.service.js";

export const scanText = async (req, res) => {
  try {
    const { messageId } = req.body;

    if (!messageId) {
      return res.status(400).json({ error: "messageId is required" });
    }

    const message = await Message.findOne({
      messageId,
      userId: req.user.userId
    });

    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    const analysis = await analyzeMessage(message.content);

    const scan = await ScanResult.create({
      scanId: crypto.randomUUID(),
      messageId: message.messageId,
      riskLevel: analysis.riskLevel,
      scanType: "TEXT",
      confidenceScore: analysis.confidenceScore,
      psychologyRiskScore: analysis.psychologyRiskScore,
      mlRiskScore: analysis.mlRiskScore,
      psychologicalFactors: analysis.psychologicalFactors,
      mlPrediction: analysis.mlPrediction,
      decision: analysis.decision,
      analysisVersion: analysis.analysisVersion,
      explanations: analysis.explanations,
      rawModelOutput: analysis.rawModelOutput
    });

    message.scanResult = scan._id;
    await message.save();

    res.status(201).json(scan);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const scanRawText = async (req, res) => {
  try {
    const { sourceType = "manual", content } = req.body;

    if (!content) {
      return res.status(400).json({ error: "content is required" });
    }

    const contentHash = crypto.createHash("sha256").update(content).digest("hex");
    const existingMessage= await Message.findOne({ contentHash });
    if (existingMessage && existingMessage.scanResult) {
      const existingScan = await ScanResult.findById(
        existingMessage.scanResult
      );

      return res.json({
        message: existingMessage,
        scan: existingScan,
        reused: true
      });
    }

    const message = await Message.create({
      messageId: crypto.randomUUID(),
      userId: req.user.userId,
      sourceType,
      content,
      contentHash
    });

    const analysis = await analyzeMessage(content);

    const scan = await ScanResult.create({
      scanId: crypto.randomUUID(),
      messageId: message.messageId,
      riskLevel: analysis.riskLevel,
      scanType: "TEXT",
      confidenceScore: analysis.confidenceScore,
      psychologyRiskScore: analysis.psychologyRiskScore,
      mlRiskScore: analysis.mlRiskScore,
      psychologicalFactors: analysis.psychologicalFactors,
      mlPrediction: analysis.mlPrediction,
      decision: analysis.decision,
      analysisVersion: analysis.analysisVersion,
      explanations: analysis.explanations,
      rawModelOutput: analysis.rawModelOutput
    });

    message.scanResult = scan._id;
    await message.save();

    res.status(201).json({ message, scan });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getScanResult = async (req, res) => {
  try {
    const scan = await ScanResult.findOne({ scanId: req.params.scanId });

    if (!scan) {
      return res.status(404).json({ error: "Not found" });
    }

    const message = await Message.findOne({
      messageId: scan.messageId,
      userId: req.user.userId
    });

    if (!message) {
      return res.status(404).json({ error: "Not found" });
    }

    res.json({ scan, message });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};