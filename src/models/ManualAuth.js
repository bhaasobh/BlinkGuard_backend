import mongoose from "mongoose";

const ManualAuthSchema = new mongoose.Schema(
  {
    user_id: { type: String, required: true, unique: true, index: true },
    password_hash: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.model("ManualAuth", ManualAuthSchema);
