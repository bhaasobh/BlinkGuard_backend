import express from "express";
import authRoutes from "./routes/auth.routes.js";
import messageRoutes from "./routes/message.routes.js";
import scanRoutes from "./routes/scan.routes.js";
import swaggerUi from "swagger-ui-express";
import specs from "./swagger.js";
import analyzeTxt from "./routes/scan.routes.js"
import reviewRoutes from "./routes/review.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import gmailRoutes from "./routes/gmail.routes.js";
const app = express();

app.use(express.json());


app.use("/auth", authRoutes);
app.use("/messages", messageRoutes);
app.use("/scan", scanRoutes);
app.use("/analyze",analyzeTxt);
app.use("/reviews", reviewRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));
app.use( "/gmail",gmailRoutes);
export default app;
