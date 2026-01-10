import express from "express";
import authRoutes from "./routes/auth.routes.js";
import messageRoutes from "./routes/message.routes.js";
import scanRoutes from "./routes/scan.routes.js";

const app = express();

app.use(express.json());

app.use("/auth", authRoutes);
app.use("/messages", messageRoutes);
app.use("/scan", scanRoutes);

export default app;
