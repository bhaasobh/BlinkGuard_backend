import express from "express";
import authRoutes from "./routes/auth.routes.js";
import messageRoutes from "./routes/message.routes.js";
import scanRoutes from "./routes/scan.routes.js";
import swaggerUi from "swagger-ui-express";
import specs from "./swagger.js";


const app = express();

app.use(express.json());


app.use("/auth", authRoutes);
app.use("/messages", messageRoutes);
app.use("/scan", scanRoutes);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));

export default app;
