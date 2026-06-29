import Message from "../models/Message.js";
import crypto from "crypto";
import { encryptMessageContent, serializeMessage } from "../utils/messageEncryption.js";
import ScanResult from "../models/ScanResult.js";
import Url from "../models/Url.js";

const EDITABLE_DECISIONS = ["safe", "spam", "phishing"];

const getRiskLevelForDecision = (decision) => {
  if (decision === "phishing") return "HIGH";
  if (decision === "spam") return "MEDIUM";
  return "LOW";
};

const getScanType = (content, scanResult = {}) => {
  if (scanResult.scanType) return scanResult.scanType;
  return content?.includes("http") ? "TEXT_URL" : "TEXT";
};

export const getMessages = async (req, res) => {
  try {
    const messages = await Message.find({ userId: req.user.userId })
      .populate("scanResult")
      .sort({ createdAt: -1 });

    const decryptedMessages = messages
      .map(serializeMessage)
      .filter((message) => !message.contentUnavailable);

    res.json(decryptedMessages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const createMessage = async (req, res) => {
  try {
    const { sourceType, content } = req.body;

    if (!sourceType || !content) {
      return res.status(400).json({ error: "sourceType and content are required" });
    }

    const message = await Message.create({
      messageId: crypto.randomUUID(),
      userId: req.user.userId,
      sourceType,
      ...encryptMessageContent(content)
    });

    res.status(201).json(serializeMessage(message));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateMessageClassification = async (req, res) => {
  try {
    const {
      messageId,
      content,
      sourceType = "MANUAL_SCAN",
      decision: rawDecision,
      scanResult = {},
      saveSafeToDatabase = false,
    } = req.body;
    const decision = rawDecision?.toLowerCase();

    if (!EDITABLE_DECISIONS.includes(decision)) {
      return res.status(400).json({ error: "decision must be safe, spam, or phishing" });
    }

    if (!messageId) {
      if (decision === "safe" && !saveSafeToDatabase) {
        return res.status(200).json({ saved: false, decision });
      }

      if (!content?.trim()) {
        return res.status(400).json({ error: "content is required" });
      }

      const newMessageId = crypto.randomUUID();
      const newScan = await ScanResult.create({
        scanId: crypto.randomUUID(),
        messageId: newMessageId,
        riskLevel: getRiskLevelForDecision(decision),
        scanType: getScanType(content, scanResult),
        confidenceScore: scanResult.confidenceScore ?? 0,
        psychologicalFactors: scanResult.psychologicalFactors ?? [],
        decision,
        explanations: scanResult.explanations ?? [],
      });

      const newMessage = await Message.create({
        messageId: newMessageId,
        userId: req.user.userId,
        sourceType,
        ...encryptMessageContent(content.trim()),
        scanResult: newScan._id,
      });

      const populatedMessage = await newMessage.populate("scanResult");
      return res.status(201).json({
        saved: true,
        message: serializeMessage(populatedMessage),
      });
    }

    const message = await Message.findOne({
      messageId,
      userId: req.user.userId,
    }).populate("scanResult");

    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    if (decision === "safe" && !saveSafeToDatabase) {
      const scanResultId = message.scanResult?._id || message.scanResult;

      await Promise.all([
        Message.deleteOne({ _id: message._id }),
        scanResultId ? ScanResult.deleteOne({ _id: scanResultId }) : Promise.resolve(),
        Url.deleteMany({ message_id: message.messageId }),
      ]);

      return res.status(200).json({ saved: false, decision });
    }

    let savedScan = message.scanResult;

    if (savedScan?._id) {
      savedScan.decision = decision;
      savedScan.riskLevel = getRiskLevelForDecision(decision);
      await savedScan.save();
    } else {
      savedScan = await ScanResult.create({
        scanId: crypto.randomUUID(),
        messageId: message.messageId,
        riskLevel: getRiskLevelForDecision(decision),
        scanType: getScanType(content, scanResult),
        confidenceScore: scanResult.confidenceScore ?? 0,
        psychologicalFactors: scanResult.psychologicalFactors ?? [],
        decision,
        explanations: scanResult.explanations ?? [],
      });

      message.scanResult = savedScan._id;
      await message.save();
    }

    const updatedMessage = await Message.findById(message._id).populate("scanResult");
    return res.status(200).json({
      saved: true,
      message: serializeMessage(updatedMessage),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};



/*export const getMonthMsgCountByType= async(req,res)=>{
  try{
    const { userId }= req.body;
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }
  }catch(err){

  }
};*/



export const getMonthMsgCountByType = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user?.userId;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const result = await Message.aggregate([
      {
        $match: {
          userId,
          createdAt: {
            $gte: startOfMonth,
            $lt: startOfNextMonth,
          },
        },
      },
      {
        $lookup: {
          from: "scanresults",
          localField: "scanResult",
          foreignField: "_id",
          as: "scanResultData",
        },
      },
      {
        $unwind: "$scanResultData",
      },
      {
        $group: {
          _id: "$scanResultData.decision",
          count: { $sum: 1 },
        },
      },
    ]);

    let suspiciousCount = 0;
    let phishingCount = 0;

    result.forEach((item) => {
      const decision = item._id?.toLowerCase();

      if (decision === "suspicious") {
        suspiciousCount = item.count;
      }

      if (decision === "phishing") {
        phishingCount = item.count;
      }
    });

    return res.status(200).json({
      suspiciousCount,
      phishingCount,
    });
  } catch (err) {
    console.error("Error getting monthly message count:", err);
    return res.status(500).json({ error: "Server error" });
  }
};



export const keyinsightsReport = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user?.userId;

    if (!userId) {
      return res.status(400).json({error: "userId is required"});
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const scanTypeResult = await Message.aggregate([
      {
        $match: {
          userId: userId.toString(),
          createdAt: {
            $gte: startOfMonth,
            $lt: startOfNextMonth,
          },
        },
      },
      {
        $lookup: {
          from: "scanresults",
          localField: "scanResult",
          foreignField: "_id",
          as: "scanResultData",
        },
      },
      {
        $unwind: "$scanResultData",
      },
      {
        $group: {
          _id: "$scanResultData.scanType",
          count: {$sum: 1},
        },
      },
      {
        $sort: {
          count: -1,
        },
      },
    ]);

    const topScanType = scanTypeResult[0]?._id || null;
    const topScanTypeCount = scanTypeResult[0]?.count || 0;

    const autoMessagesCount = await Message.countDocuments({
      userId: userId.toString(),
      sourceType: "AUTO_SCAN",
      createdAt: {
        $gte: startOfMonth,
        $lt: startOfNextMonth,
      },
    });

    const reviewCount = 0;

    return res.status(200).json({
      topScanType,
      topScanTypeCount,
      autoMessagesCount,
      reviewCount,
    });
  } catch (err) {
    console.error("Error getting key insights report:", err);
    return res.status(500).json({error: "Server error"});
  }
};
