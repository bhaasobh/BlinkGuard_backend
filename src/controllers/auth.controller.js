import User from "../models/User.js";
import ManualAuth from "../models/ManualAuth.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const register = async (req, res) => {
  const { email, password, country, displayName } = req.body;

  try {
    const user = await User.create({ email, country, displayName });

    const hash = await bcrypt.hash(password, 10);
    await ManualAuth.create({
      userId: user._id,
      passwordHash: hash
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

  const auth = await ManualAuth.findOne({ userId: user._id });
  const valid = await bcrypt.compare(password, auth.passwordHash);

  if (!valid) return res.status(401).json({ error: "Invalid credentials" });

  const token = jwt.sign(
    { userId: user._id },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );

  res.json({ token });
};
