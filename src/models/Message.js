import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema(
  {
    messageId: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    sourceType: { type: String, required: true, trim: true },
    content: { type: String, required: false, trim: true },
    contentHash: { type: String, required: true, index: true },
    scanResult: { type: mongoose.Schema.Types.ObjectId, ref: "ScanResult" }
  },
  { timestamps: true }
);

export default mongoose.model("Message", MessageSchema);