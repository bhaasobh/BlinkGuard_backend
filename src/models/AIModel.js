const mongoose = require("mongoose");

const AIModelSchema = new mongoose.Schema(
  {
    modelId: { type: String, required: true, unique: true, index: true },
    modelName: { type: String, required: true, trim: true },
    version: { type: String, required: true, trim: true },
    modelType: { type: String, required: true, trim: true },
    createdAt: { type: Date, default: Date.now },
    metrics: { type: Map, of: Number, default: {} },
    isActive: { type: Boolean, default: false },
  },
  { timestamps: true }
);

AIModelSchema.index({ modelName: 1, version: 1 }, { unique: true });

module.exports = mongoose.model("AIModel", AIModelSchema);
