import User from "../models/User.js";
import ManualAuth from "../models/ManualAuth.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";

import GoogleAuth from "../models/GoogleAuth.js";
import {google} from "googleapis";

export const register = async (req, res) => {
  const {
    email,
    password,
    country,
    display_name,
    device_id,
    fcm_token
  } = req.body;

  try {
    const userId = crypto.randomUUID();

    const user = await User.create({
      user_id: userId,
      email,
      country,
      display_name,
      device_id,
      fcm_token
    });

    const hash = await bcrypt.hash(password, 10);
    await ManualAuth.create({
      user_id: user.user_id,
      password_hash: hash
    });

    res.status(201).json({ message: "User registered" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const auth = await ManualAuth.findOne({ user_id: user.user_id });
  const valid = await bcrypt.compare(password, auth.password_hash);

  if (!valid) return res.status(401).json({ error: "Invalid credentials" });

  const token = jwt.sign(
    { userId: user.user_id },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );

  res.json({ token });
};


export const logout=async(res,req)=>{
  try{
      res.json({message:"Loged out successfully"});
  }catch(err){
    res.status(500).json({error: err.message});
  }
};




//this is for the google auth 
function encryptToken(plain) {
  const key = Buffer.from(process.env.TOKEN_ENC_KEY, "hex"); 
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // store iv + tag + ciphertext
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export const googleSignup = async (req, res) => {
  try {
    const { serverAuthCode, email, display_name, country, device_id, fcm_token } = req.body;

    if (!serverAuthCode) {
      return res.status(400).json({ error: "serverAuthCode is required" });
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,       // WEB client
      process.env.GOOGLE_CLIENT_SECRET
    );

    // Exchange the code for tokens
    const { tokens } = await oauth2Client.getToken(serverAuthCode);


    if (!tokens.refresh_token) {
      return res.status(400).json({
        error:
          "Google did not return refresh_token. Remove BlinkGuard access from your Google account and try again, or ensure offlineAccess/forceCodeForRefreshToken are enabled.",
      });
    }

    // Create/find user
    let user = null;

    // Prefer the email from Google if available (you send it from frontend)
    const userEmail = email;
    if (!userEmail) return res.status(400).json({ error: "email is required" });

    user = await User.findOne({ email: userEmail });

    if (!user) {
      const userId = crypto.randomUUID();

      user = await User.create({
        user_id: userId,
        email: userEmail,
        country: country || "",
        display_name: display_name || "",
        device_id: device_id || "",
        fcm_token: fcm_token || "",
      });
    } else {
      // optional: update device/fcm on login
      await User.updateOne(
        { user_id: user.user_id },
        { $set: { device_id: device_id || user.device_id, fcm_token: fcm_token || user.fcm_token } }
      );
    }

    // Save Google refresh token securely (encrypted)
    const refreshEnc = encryptToken(tokens.refresh_token);

    await GoogleAuth.findOneAndUpdate(
      { user_id: user.user_id },
      {
        user_id: user.user_id,
        refresh_token_enc: refreshEnc,
        access_token: tokens.access_token || null,
        expiry_date: tokens.expiry_date || null,
      },
      { upsert: true, new: true }
    );

    // Issue your app JWT same as login()
    const token = jwt.sign(
      { userId: user.user_id },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({ token, message: "Google signup/login success" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};