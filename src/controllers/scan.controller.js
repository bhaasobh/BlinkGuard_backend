import ScanResult from "../models/ScanResult.js";

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
