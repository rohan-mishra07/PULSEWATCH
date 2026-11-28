
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import workspaceRoutes from "./modules/workspace/workspace.routes.js";

import authRoutes from "./modules/auth/auth.routes.js";
import { authenticate } from "./modules/auth/auth.middleware.js";

const app = express();

app.use(helmet());

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

// Health check
app.get("/api/v1/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "PulseWatch API is running!",
    timestamp: new Date().toISOString(),
  });
});

// Authentication routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/workspaces", workspaceRoutes);
// Protected user route
app.get("/api/v1/auth/me", authenticate, (req, res) => {
  res.status(200).json({
    success: true,
    message: "Authentication successful",
    userId: req.user.id,
  });
});

export default app;
