import crypto from "crypto";
import Message from "../models/Message.js";
import ScanResult from "../models/ScanResult.js";
import { analyzeMessage } from "../services/ai/ai.service.js";
const MODEL_TIMEOUT_MS = Number(process.env.HF_TIMEOUT_MS || 8000);

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


export const analyzeTxt = async (req, res) => {
  const timeout = setTimeout(() => controller.abort(), MODEL_TIMEOUT_MS);
  try {
    const headers = { "Content-Type": "application/json" };
    const controller = new AbortController();
    
    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ error: "content is required" });
    }


    const url = 'https://blinkguardbackendmasanalyze-production.up.railway.app/analyze';
    console.log("URL:", url);

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ message: content }),
      signal: controller.signal
    });
        if (!response.ok) {
      const text = await response.text();
      console.error("HF error body:", text);
      throw new Error(`HF model request failed: ${response.status} ${text}`);
    }

    const data = await response.json();
    console.log("data:", data);
    res.status(201).json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }finally{
    clearTimeout(timeout);
  }
};