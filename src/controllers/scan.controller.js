import crypto from "crypto";
import Message from "../models/Message.js";
import ScanResult from "../models/ScanResult.js";
import { scanUrl } from "../services/scan.service.js";
import { analyzeMessage } from "../services/ai/ai.service.js";
import { error } from "console";
const MODEL_TIMEOUT_MS = Number(process.env.HF_TIMEOUT_MS || 8000);

export const scanUrlController = async (req, res) => {

  try {

    const { url } = req.body;
if (!url) {
  return res.status(400).json({ error: "URL is required" });
}
    const result = await scanUrl(url);

    res.json(result);

  } catch (err) {

    res.status(500).json({ error: err.message });

  }

};
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

/*export const analyzeTxt = async (req, res) => {
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
*/













const extractUrls = text => {
  const matches = text.match(/https?:\/\/[^\s]+/g);
  return [...new Set(matches || [])];
};

const combineResults = (analysis, urlResults) => {
  let reasons = [];

  const textScore =
    typeof analysis?.final_risk_score === "number"
      ? analysis.final_risk_score * 100
      : null;

  if (analysis?.explanations) {
    if (Array.isArray(analysis.explanations)) {
      reasons.push(...analysis.explanations.map(r => `Text: ${r}`));
    } else {
      reasons.push(`Text: ${analysis.explanations}`);
    }
  }

  console.log("analysis", analysis);

  const urlScores = urlResults
    .map(u =>
      typeof u?.riskScore === "number"
        ? u.riskScore
        : null
    )
    .filter(s => s !== null);

  const maxUrlScore =
    urlScores.length > 0
      ? Math.max(...urlScores)
      : null;

  urlResults.forEach((urlRes, index) => {
    if (urlRes?.reason) {
      reasons.push(`URL ${index + 1}: ${urlRes.reason}`);
    }
  });

  let finalScore = 0;

  if (textScore !== null && maxUrlScore !== null) {

    finalScore = Math.min(
      100,
      textScore * 0.4 + maxUrlScore * 0.6
    );

  } else if (textScore !== null) {

    finalScore = textScore;

  } else if (maxUrlScore !== null) {

    finalScore = maxUrlScore;

  } else {

    finalScore = 0;
  }

  if (
    textScore !== null &&
    textScore < 30 &&
    analysis?.explanations?.length > 0
  ) {
    finalScore = Math.max(finalScore, 55);
  }

  if (
    maxUrlScore !== null &&
    maxUrlScore < 50 &&
    urlResults.length > 0
  ) {
    finalScore = Math.max(finalScore, 70);
  }

  return {
    finalScore,
    reasons,
  };
};














export const analyzeTxt = async (req, res) => {
  let timeout;
  let controller;
  try{
    const { content,sourceType}= req.body;
    if(!content || !content.trim()){
      return res.status(400).json({error:"content is reqired"});
    }

    const cleanContent=content.trim();
    const userId = req.user?.id || req.user?._id || req.user?.userId;
    const contentHash = crypto
      .createHash("sha256")
      .update(cleanContent)
      .digest("hex");
    const existingMessage = await Message.findOne({ contentHash }).populate("scanResult");

    if (existingMessage && existingMessage.scanResult) {
      const scan = existingMessage.scanResult;

      return res.status(200).json({
        fromDB: true,
        saved: true,
        data: {
          message: existingMessage.content,
          ml_prediction: scan.mlPrediction ?? "",
          final_decision: scan.decision ?? "",
          risk_band: scan.riskLevel ?? "LOW",
          final_risk_score: scan.confidenceScore ?? 0,
          psychological_factors: scan.psychologicalFactors ?? [],
          explanations: scan.explanations ?? [],
        },
      });
    }
//here it does the ml scan alone
    controller=new AbortController();
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
      throw new Error(`ML model request failed: ${response.status} ${text}`);
    }

    const apiResponse = await response.json();
    const analysis = apiResponse?.data || apiResponse;

//here it extracts the url and then does the scan for it 
    const urls = extractUrls(cleanContent);
    const urlResults = await Promise.all(
  urls.map(async url => {
    try {
      return await scanUrl(url);
    } catch (err) {
      console.log("URL scan failed:", url, err.message);

      return {
        url,
        riskScore: 0,
        reason: "URL scan failed or invalid URL",
        heuristic_reasons: ["Invalid or unsupported URL"],
      };
    }
  })
);

//here it combines the two results together to make a final result
    const finalResult = combineResults(analysis, urlResults);
    const finalDecision = finalResult.finalScore < 40 ? 'not phishing' : 'phishing';
    const riskBand= finalResult.finalScore < 30
        ? 'LOW'
        : finalResult.finalScore < 70
        ? 'MEDIUM'
        : 'HIGH';
    const shouldSave = finalDecision === "suspicious" || finalDecision === "phishing";

//here is to safe the message to db if it is phishing
   if (shouldSave) {
      const messageId = crypto.randomUUID();
      const scanId = crypto.randomUUID();
      const scanType =
  urls.length > 0 && cleanContent.replace(/https?:\/\/[^\s]+/g, "").trim().length > 0
    ? "TEXT_URL"
    : urls.length > 0
    ? "URL"
    : "TEXT";

      const savedScanResult = await ScanResult.create({
        scanId,
        messageId,
        riskLevel: riskBand,
        scanType,
        confidenceScore: finalResult.finalScore / 100,
        psychologyRiskScore: analysis?.psychology_average ?? 0,
        mlRiskScore: analysis?.ml_risk_score ?? 0,
        psychologicalFactors: analysis?.psychological_factors ?? [],
        mlPrediction: analysis?.ml_prediction ?? "",
        decision: finalDecision,
        explanations: finalResult.reasons,
        rawModelOutput: {
          textAnalysis: analysis,
          urlResults,
          finalResult,
        },
      });
      await Message.create({
        messageId,
        userId: userId || "unknown",
        sourceType: sourceType || "MANUAL_SCAN",
        content: cleanContent,
        contentHash,
        scanResult: savedScanResult._id,
      });
    }

    return res.status(200).json({
      fromDB: false,
      saved: shouldSave,
      data: {
        message: cleanContent,
        ml_prediction: analysis?.ml_prediction ?? "",
        final_decision: finalDecision,
        risk_band: riskBand,
        final_risk_score: finalResult.finalScore / 100,
        psychological_factors: analysis?.psychological_factors ?? [],
        explanations: finalResult.reasons,
        urlResults,
      },
    });
  }catch(err){
    return res.status(500).json({ error: err.message });
  }finally{
    if (timeout) clearTimeout(timeout);
  }
};