import Message from "../models/Message.js";
import crypto from "crypto";
import ScanResult from "../models/ScanResult.js";

export const createMessage = async (req, res) => {
  try {
    const { sourceType, content } = req.body;

    if (!sourceType || !content) {
      return res.status(400).json({ error: "sourceType and content are required" });
    }

    const hash = crypto.createHash("sha256").update(content).digest("hex");

    const message = await Message.create({
      messageId: crypto.randomUUID(),
      userId: req.user.userId,
      sourceType,
      contentHash: hash
    });

    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ error: err.message });
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
    const { userId } = req.body;

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