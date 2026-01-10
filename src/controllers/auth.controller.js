import User from "../models/User.js";
import ManualAuth from "../models/ManualAuth.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";

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
