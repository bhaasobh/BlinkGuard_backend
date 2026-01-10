const mongoose = require("mongoose");

const UrlSchema = new mongoose.Schema(
  {
    message_id: { type: String, required: true, index: true },
    original_url: { type: String, required: true, trim: true },
    expanded_url: { type: String, trim: true },
    is_shortened: { type: Boolean, default: false },
  },
  { timestamps: true }
);

UrlSchema.index({ message_id: 1, original_url: 1 }, { unique: true });

module.exports = mongoose.model("Url", UrlSchema);
