import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    user_id: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    display_name: { type: String, required: true, trim: true },
    country: { type: String, trim: true },
    device_id: { type: String, trim: true },
    fcm_token: { type: String, trim: true },
  },
  { timestamps: true }
);

export default mongoose.model("User", UserSchema);
