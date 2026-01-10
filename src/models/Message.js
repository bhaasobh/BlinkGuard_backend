const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema(
  {
    message_id: { type: String, required: true, unique: true, index: true },
    content_hash: { type: String, required: true, index: true },
    source_type: { type: String, required: true, trim: true },
    scan_result: { type: mongoose.Schema.Types.ObjectId, ref: "ScanResult" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Message", MessageSchema);
