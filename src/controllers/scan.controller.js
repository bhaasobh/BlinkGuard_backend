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
  let timeout;
  let controller;

  try {
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: "content is required" });
    }

    const cleanContent = content.trim();
    const userId = req.user?.id || req.user?._id || req.user?.userId;

    const contentHash = crypto
      .createHash("sha256")
      .update(cleanContent)
      .digest("hex");

    //this checks if message already exists in db (message model and scanresult in db)
    const existingMessage = await Message.findOne({ contentHash }).populate("scanResult");

    if (existingMessage && existingMessage.scanResult) {
      const scan = existingMessage.scanResult;

      return res.status(200).json({
        fromDB: true,
        data: {
          message: existingMessage.content,
          ml_prediction: scan.mlPrediction ?? "",
          ml_risk_score: scan.mlRiskScore ?? 0,
          final_decision: scan.decision ?? "",
          risk_band: scan.riskLevel ? scan.riskLevel.toLowerCase() : "low",
          final_risk_score: scan.confidenceScore ?? 0,
          psychology_average: scan.psychologyRiskScore ?? 0,
          psychological_factors: scan.psychologicalFactors ?? [],
          explanations: scan.explanations ?? [],
        },
      });
    }

    //this is to analyze with ai+psychology rules
    controller = new AbortController();
    timeout = setTimeout(() => controller.abort(), MODEL_TIMEOUT_MS);

    const response = await fetch(
      "https://blinkguardbackendmasanalyze-production.up.railway.app/analyze",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: cleanContent }),
        signal: controller.signal,
      }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HF model request failed: ${response.status} ${text}`);
    }

    const apiResponse = await response.json();
    const analysis = apiResponse?.data || apiResponse;

    const factors = analysis?.psychology_risk_scores || {};
    const explanations = [];

    if (factors.urgency > 0) explanations.push("Uses urgency language");
    if (factors.authority > 0) explanations.push("References authority or official organizations");
    if (factors.fear > 0) explanations.push("Uses fear or threat language");
    if (factors.reward > 0) explanations.push("Offers a reward or prize");
    if (factors.link > 0) explanations.push("Contains a link or shortened URL");
    if (factors.contact_pressure > 0) explanations.push("Pushes the user to verify, click, or sign in");
    if (factors.formatting > 0) explanations.push("Uses aggressive formatting");

    const decision = (analysis?.final_decision || "").toLowerCase();
    const shouldSave = decision === "suspicious" || decision === "phishing";

    //this is to save suspicious/phishing messages
    if (shouldSave) {
      const messageId = crypto.randomUUID();
      const scanId = crypto.randomUUID();

      let riskLevel = "LOW";
      if ((analysis?.risk_band || "").toLowerCase() === "medium") riskLevel = "MEDIUM";
      if ((analysis?.risk_band || "").toLowerCase() === "high") riskLevel = "HIGH";

      const savedScanResult = await ScanResult.create({
        scanId,
        messageId,
        riskLevel,
        scanType: "TEXT",
        confidenceScore: analysis?.final_risk_score ?? 0,
        psychologyRiskScore: analysis?.psychology_average ?? 0,
        mlRiskScore: analysis?.ml_risk_score ?? 0,
        psychologicalFactors: analysis?.psychological_factors ?? [],
        mlPrediction: analysis?.ml_prediction ?? "",
        decision: analysis?.final_decision ?? "",
        explanations,
        rawModelOutput: analysis,
      });

      await Message.create({
        messageId,
        userId: userId || "unknown",
        sourceType: "MANUAL_SCAN",
        content: cleanContent,
        contentHash,
        scanResult: savedScanResult._id,
      });
    }

    //this return response
    return res.status(200).json({
      fromDB: false,
      saved: shouldSave,
      data: {
        message: analysis?.message ?? cleanContent,
        ml_prediction: analysis?.ml_prediction ?? "",
        ml_confidence: analysis?.ml_confidence ?? 0,
        ml_risk_score: analysis?.ml_risk_score ?? 0,
        final_decision: analysis?.final_decision ?? "",
        risk_band: analysis?.risk_band ?? "low",
        final_risk_score: analysis?.final_risk_score ?? 0,
        psychology_average: analysis?.psychology_average ?? 0,
        high_signal_count: analysis?.high_signal_count ?? 0,
        psychological_factors: analysis?.psychological_factors ?? [],
        psychology_risk_scores: analysis?.psychology_risk_scores ?? {},
        explanations,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  } finally {
    if (timeout) clearTimeout(timeout);
  }
};