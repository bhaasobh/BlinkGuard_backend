import { analyzePsychology } from "./psychologyRules.js";

const DEFAULT_MODEL_REPO = process.env.HF_MODEL_REPO || "bahaasobeh/blinkguard";
const MODEL_TIMEOUT_MS = Number(process.env.HF_TIMEOUT_MS || 15000);

function normalizeMlResult(data) {
  const first = Array.isArray(data?.[0]) ? data[0][0] : Array.isArray(data) ? data[0] : data;

  if (!first) {
    return {
      prediction: "unavailable",
      score: 0,
      raw: data
    };
  }

  const label = String(first.label || "").toLowerCase();
  const score = Number(first.score || 0);

  const isSpam =
    label.includes("spam") ||
    label.includes("label_1") ||
    label.includes("phishing");

  return {
    prediction: isSpam ? "spam" : "not spam",
    score: isSpam ? score : 1 - score,
    raw: data
  };
}

async function callHuggingFaceModel(message) {
  console.log("Entering callHuggingFaceModel");
  console.log("Model repo:", DEFAULT_MODEL_REPO);
  console.log("Has token:", !!process.env.HF_API_TOKEN);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), MODEL_TIMEOUT_MS);

  try {
    const headers = { "Content-Type": "application/json" };

    if (process.env.HF_API_TOKEN) {
      headers.Authorization = `Bearer ${process.env.HF_API_TOKEN}`;
    }

    const url = `https://router.huggingface.co/hf-inference/models/${DEFAULT_MODEL_REPO}`;
    console.log("HF URL:", url);

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ inputs: message }),
      signal: controller.signal
    });

    console.log("HF status:", response.status);

    if (!response.ok) {
      const text = await response.text();
      console.error("HF error body:", text);
      throw new Error(`HF model request failed: ${response.status} ${text}`);
    }

    const data = await response.json();
    console.log("HF success data:", data);
    return normalizeMlResult(data);
  } finally {
    clearTimeout(timeout);
  }
}

function riskBand(score) {
  if (score >= 0.6) return "HIGH";
  if (score >= 0.3) return "MEDIUM";
  return "LOW";
}

export async function analyzeMessage(message = "") {
  const psychology = analyzePsychology(message);

  let ml = null;
  let modelError = null;

  try {
    ml = await callHuggingFaceModel(message);
  } catch (err) {
    modelError = err.message;
  }

  const mlRiskScore = ml?.score ?? 0;
  let combinedScore = (mlRiskScore * 0.55) + (psychology.totalScore * 0.45);

  const factors = psychology.factors;
  if (factors.urgency > 0 && factors.fear > 0) combinedScore += 0.1;
  if (factors.authority > 0 && factors.contactPressure > 0) combinedScore += 0.12;
  if (factors.linkPresent && factors.contactPressure > 0) combinedScore += 0.12;

  combinedScore = Math.min(Number(combinedScore.toFixed(4)), 1);

  const riskLevel = riskBand(combinedScore);
  const decision =
    combinedScore >= 0.7
      ? "MALICIOUS"
      : combinedScore >= 0.35
      ? "SUSPICIOUS"
      : "SAFE";

  const explanations = [...psychology.explanations];
  if (ml?.prediction === "spam") {
    explanations.unshift("ML model flagged the message as spam-like");
  }
  if (modelError) {
    explanations.push("ML model was unavailable, so this result used rules more heavily");
  }

  return {
    riskLevel,
    decision,
    confidenceScore: combinedScore,
    psychologyRiskScore: psychology.totalScore,
    mlRiskScore,
    mlPrediction: ml?.prediction || "unavailable",
    psychologicalFactors: factors,
    analysisVersion: "blinkguard-hybrid-v1",
    explanations,
    rawModelOutput: ml?.raw || { error: modelError || null }
  };
}