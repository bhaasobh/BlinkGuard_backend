const mongoose = require("mongoose");

const ManualAuthSchema = new mongoose.Schema(
  {
    user_id: { type: String, required: true, unique: true, index: true },
    password_hash: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ManualAuth", ManualAuthSchema);
