import Message from "../models/Message.js";
import ScanResult from "../models/ScanResult.js";
import User from "../models/User.js";
import { serializeMessage } from "../utils/messageEncryption.js";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const parsePagination = (query) => {
  const page = Math.max(Number.parseInt(query.page, 10) || 1, 1);
  const requestedLimit = Number.parseInt(query.limit, 10) || DEFAULT_LIMIT;
  const limit = Math.min(Math.max(requestedLimit, 1), MAX_LIMIT);
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

const parseDateRange = (query) => {
  const createdAt = {};

  if (query.from) {
    const from = new Date(query.from);
    if (!Number.isNaN(from.getTime())) createdAt.$gte = from;
  }

  if (query.to) {
    const to = new Date(query.to);
    if (!Number.isNaN(to.getTime())) createdAt.$lte = to;
  }

  return Object.keys(createdAt).length ? { createdAt } : {};
};

const buildScanFilter = (query) => {
  const filter = {
    ...parseDateRange(query)
  };

  if (query.riskLevel) filter.riskLevel = query.riskLevel.toUpperCase();
  if (query.scanType) filter.scanType = query.scanType.toUpperCase();
  if (query.urlStatus) filter.urlStatus = query.urlStatus.toUpperCase();

  return filter;
};

const formatCounts = (rows, keys) => {
  const counts = Object.fromEntries(keys.map((key) => [key, 0]));

  rows.forEach((row) => {
    if (row._id) counts[row._id] = row.count;
  });

  return counts;
};

const buildUserNameMap = async (userIds) => {
  const uniqueUserIds = [...new Set(userIds.filter(Boolean))];

  if (uniqueUserIds.length === 0) return new Map();

  const users = await User.find({ user_id: { $in: uniqueUserIds } })
    .select("user_id display_name")
    .lean();

  return new Map(users.map((user) => [user.user_id, user.display_name]));
};

const serializeDashboardMessage = (message, userNamesById) => {
  const data = serializeMessage(message);

  return {
    ...data,
    userName: userNamesById.get(data.userId) || ""
  };
};

const serializeDashboardMessages = async (messages) => {
  const userNamesById = await buildUserNameMap(
    messages.map((message) => message.userId)
  );

  return messages.map((message) => serializeDashboardMessage(message, userNamesById));
};

export const getDashboardSummary = async (req, res) => {
  try {
    const [
      totalUsers,
      totalMessages,
      totalScans,
      riskRows,
      urlStatusRows,
      recentMessages,
      recentHighRiskScans
    ] = await Promise.all([
      User.countDocuments(),
      Message.countDocuments(),
      ScanResult.countDocuments(),
      ScanResult.aggregate([{ $group: { _id: "$riskLevel", count: { $sum: 1 } } }]),
      ScanResult.aggregate([{ $group: { _id: "$urlStatus", count: { $sum: 1 } } }]),
      Message.find()
        .populate("scanResult")
        .sort({ createdAt: -1 })
        .limit(10),
      ScanResult.find({ riskLevel: "HIGH" })
        .sort({ createdAt: -1 })
        .limit(10)
    ]);
    const serializedRecentMessages = await serializeDashboardMessages(recentMessages);

    res.json({
      totals: {
        users: totalUsers,
        messages: totalMessages,
        scans: totalScans
      },
      riskLevels: formatCounts(riskRows, ["LOW", "MEDIUM", "HIGH"]),
      urlStatuses: formatCounts(urlStatusRows, ["SAFE", "SUSPICIOUS", "MALICIOUS"]),
      recentMessages: serializedRecentMessages,
      recentHighRiskScans
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getDashboardUsers = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);

    const [total, users] = await Promise.all([
      User.countDocuments(),
      User.find()
        .select("user_id email display_name country device_id createdAt updatedAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
    ]);

    const userIds = users.map((user) => user.user_id);
    const messageCounts = await Message.aggregate([
      { $match: { userId: { $in: userIds } } },
      { $group: { _id: "$userId", count: { $sum: 1 } } }
    ]);
    const countsByUserId = new Map(messageCounts.map((row) => [row._id, row.count]));

    res.json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      data: users.map((user) => ({
        ...user,
        messageCount: countsByUserId.get(user.user_id) || 0
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getDashboardMessages = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = {
      ...parseDateRange(req.query)
    };

    if (req.query.userId) filter.userId = req.query.userId;
    if (req.query.sourceType) filter.sourceType = req.query.sourceType;

    if (req.query.riskLevel || req.query.scanType || req.query.urlStatus) {
      const scanFilter = buildScanFilter(req.query);
      const scans = await ScanResult.find(scanFilter).select("_id").lean();
      filter.scanResult = { $in: scans.map((scan) => scan._id) };
    }

    const [total, messages] = await Promise.all([
      Message.countDocuments(filter),
      Message.find(filter)
        .populate("scanResult")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
    ]);
    const serializedMessages = await serializeDashboardMessages(messages);

    res.json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      data: serializedMessages
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getDashboardScans = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = buildScanFilter(req.query);

    const [total, scans] = await Promise.all([
      ScanResult.countDocuments(filter),
      ScanResult.find(filter)
        .select(
          "scanId messageId riskLevel scanType urlStatus confidenceScore psychologyRiskScore mlRiskScore psychologicalFactors mlPrediction decision analysisVersion explanations rawModelOutput createdAt updatedAt"
        )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
    ]);

    res.json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      data: scans
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getDashboardMessageById = async (req, res) => {
  try {
    const message = await Message.findOne({ messageId: req.params.messageId }).populate("scanResult");

    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    const userNamesById = await buildUserNameMap([message.userId]);

    res.json(serializeDashboardMessage(message, userNamesById));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
