import mongoose from "mongoose";

const GoogleAuthSchema = new mongoose.Schema(
  {
    user_id: { type: String, required: true, unique: true },
    refresh_token_enc: { type: String, required: true }, 
    access_token: { type: String },               
    expiry_date: { type: Number },          
  },
  { timestamps: true }
);

export default mongoose.model("GoogleAuth", GoogleAuthSchema);