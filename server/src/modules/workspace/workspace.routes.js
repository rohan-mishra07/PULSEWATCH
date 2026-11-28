
import express from "express";

import { authenticate } from "../auth/auth.middleware.js";

import {
  createWorkspace,
  getMyWorkspaces,
  getWorkspaceById,
  updateWorkspace,
  deleteWorkspace,
  addWorkspaceMember,
  updateWorkspaceMemberRole,
  removeWorkspaceMember,
} from "./workspace.controller.js";

const router = express.Router();

// All workspace routes require authentication.
router.use(authenticate);

// Workspace operations
router.post("/", createWorkspace);
router.get("/", getMyWorkspaces);
router.get("/:workspaceId", getWorkspaceById);
router.patch("/:workspaceId", updateWorkspace);
router.delete("/:workspaceId", deleteWorkspace);

// Member operations
router.post("/:workspaceId/members", addWorkspaceMember);
router.patch(
  "/:workspaceId/members/:memberId/role",
  updateWorkspaceMemberRole
);
router.delete(
  "/:workspaceId/members/:memberId",
  removeWorkspaceMember
);

export default router;
