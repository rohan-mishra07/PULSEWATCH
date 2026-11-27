
import express from "express";

import {
  registerUser,
  loginUser,
  refreshAccessToken,
  logoutUser,
} from "./auth.controller.js";

const router = express.Router();

// Register
router.post("/register", registerUser);

// Login
router.post("/login", loginUser);

// Refresh access token
router.post("/refresh", refreshAccessToken);

// Logout
router.post("/logout", logoutUser);

export default router;
