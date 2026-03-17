import ScanResult from "../models/ScanResult.js";
import { scanUrl } from "../services/scan.service.js";

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
  const { messageId } = req.body;

  // TEMP logic (no ML yet)
  const result = await ScanResult.create({
    messageId,
    riskLevel: "MEDIUM",
    scanType: "AUTOMATED",
    confidenceScore: 0.62,
    psychologyRiskScore: 0.4,
    psychologicalFactors: {
      urgency: true,
      authorityPressure: false
    }
  });

  res.status(201).json(result);
};

export const getScanResult = async (req, res) => {
  const scan = await ScanResult.findById(req.params.scanId)
    .populate("messageId");

  if (!scan) return res.status(404).json({ error: "Not found" });

  res.json(scan);
};

