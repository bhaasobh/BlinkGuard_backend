const mongoose = require("mongoose");

const SocialAuthSchema = new mongoose.Schema(
  {
    user_id: { type: String, required: true, index: true },
    provider: { type: String, required: true, trim: true },
    provider_user_id: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

SocialAuthSchema.index({ provider: 1, provider_user_id: 1 }, { unique: true }); //Ensures the same external account can’t be linked to multiple local users.
SocialAuthSchema.index({ user_id: 1, provider: 1 }, { unique: true }); //Ensures a single local user can’t have duplicate links to the same provider

module.exports = mongoose.model("SocialAuth", SocialAuthSchema);
