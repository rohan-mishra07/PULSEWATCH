
import { randomBytes } from "node:crypto";
import prisma from "../../config/prisma.js";

import {
  createWorkspaceSchema,
  updateWorkspaceSchema,
  addMemberSchema,
  updateMemberRoleSchema,
} from "./workspace.validation.js";

// Generate a URL-friendly unique slug.
const generateSlug = (name) => {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return `${base}-${randomBytes(4).toString("hex")}`;
};

// Find the current user's membership in a workspace.
const getMembership = (workspaceId, userId) =>
  prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: {
        userId,
        workspaceId,
      },
    },
  });

// Check whether the user is an OWNER or ADMIN.
const canManageWorkspace = (role) =>
  role === "OWNER" || role === "ADMIN";

// 1. CREATE WORKSPACE
export const createWorkspace = async (req, res) => {
  try {
    const validation = createWorkspaceSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid workspace details",
        errors: validation.error.flatten(),
      });
    }

    const workspace = await prisma.workspace.create({
      data: {
        name: validation.data.name,
        slug: generateSlug(validation.data.name),
        members: {
          create: {
            userId: req.user.id,
            role: "OWNER",
          },
        },
      },
      include: {
        _count: {
          select: {
            members: true,
            monitors: true,
          },
        },
      },
    });

    return res.status(201).json({
      success: true,
      message: "Workspace created successfully",
      workspace,
    });
  } catch (error) {
    console.error("Create workspace error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create workspace",
    });
  }
};

// 2. LIST MY WORKSPACES
export const getMyWorkspaces = async (req, res) => {
  try {
    const memberships = await prisma.workspaceMember.findMany({
      where: {
        userId: req.user.id,
      },
      include: {
        workspace: {
          include: {
            _count: {
              select: {
                members: true,
                monitors: true,
              },
            },
          },
        },
      },
      orderBy: {
        joinedAt: "desc",
      },
    });

    return res.status(200).json({
      success: true,
      count: memberships.length,
      workspaces: memberships.map((membership) => ({
        ...membership.workspace,
        myRole: membership.role,
      })),
    });
  } catch (error) {
    console.error("Get workspaces error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch workspaces",
    });
  }
};

// 3. GET WORKSPACE DETAILS
export const getWorkspaceById = async (req, res) => {
  try {
    const { workspaceId } = req.params;

    const membership = await getMembership(workspaceId, req.user.id);

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: "You are not a member of this workspace",
      });
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            joinedAt: "asc",
          },
        },
        _count: {
          select: {
            monitors: true,
            notificationChannels: true,
            apiKeys: true,
          },
        },
      },
    });

    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: "Workspace not found",
      });
    }

    return res.status(200).json({
      success: true,
      workspace,
      myRole: membership.role,
    });
  } catch (error) {
    console.error("Get workspace error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch workspace",
    });
  }
};

// 4. UPDATE WORKSPACE
export const updateWorkspace = async (req, res) => {
  try {
    const validation = updateWorkspaceSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid workspace details",
        errors: validation.error.flatten(),
      });
    }

    const { workspaceId } = req.params;
    const membership = await getMembership(workspaceId, req.user.id);

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: "You are not a member of this workspace",
      });
    }

    if (!canManageWorkspace(membership.role)) {
      return res.status(403).json({
        success: false,
        message: "Only OWNER or ADMIN can update this workspace",
      });
    }

    const workspace = await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        name: validation.data.name,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Workspace updated successfully",
      workspace,
    });
  } catch (error) {
    console.error("Update workspace error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update workspace",
    });
  }
};

// 5. DELETE WORKSPACE
export const deleteWorkspace = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const membership = await getMembership(workspaceId, req.user.id);

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: "You are not a member of this workspace",
      });
    }

    if (membership.role !== "OWNER") {
      return res.status(403).json({
        success: false,
        message: "Only the workspace OWNER can delete it",
      });
    }

    await prisma.workspace.delete({
      where: { id: workspaceId },
    });

    return res.status(200).json({
      success: true,
      message: "Workspace deleted successfully",
    });
  } catch (error) {
    console.error("Delete workspace error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete workspace",
    });
  }
};

// 6. ADD MEMBER
export const addWorkspaceMember = async (req, res) => {
  try {
    const validation = addMemberSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid member details",
        errors: validation.error.flatten(),
      });
    }

    const { workspaceId } = req.params;
    const { email, role } = validation.data;

    const membership = await getMembership(workspaceId, req.user.id);

    if (!membership || !canManageWorkspace(membership.role)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to add members",
      });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User with this email does not exist",
      });
    }

    const existingMember = await getMembership(workspaceId, user.id);

    if (existingMember) {
      return res.status(409).json({
        success: false,
        message: "User is already a workspace member",
      });
    }

    const newMember = await prisma.workspaceMember.create({
      data: {
        userId: user.id,
        workspaceId,
        role,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return res.status(201).json({
      success: true,
      message: "Member added successfully",
      member: newMember,
    });
  } catch (error) {
    console.error("Add member error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to add member",
    });
  }
};

// 7. UPDATE MEMBER ROLE (OWNER ONLY)
export const updateWorkspaceMemberRole = async (req, res) => {
  try {
    const validation = updateMemberRoleSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid member role",
        errors: validation.error.flatten(),
      });
    }

    const { workspaceId, memberId } = req.params;
    const membership = await getMembership(workspaceId, req.user.id);

    if (!membership || membership.role !== "OWNER") {
      return res.status(403).json({
        success: false,
        message: "Only the workspace OWNER can change member roles",
      });
    }

    const targetMember = await prisma.workspaceMember.findFirst({
      where: {
        id: memberId,
        workspaceId,
      },
    });

    if (!targetMember) {
      return res.status(404).json({
        success: false,
        message: "Workspace member not found",
      });
    }

    if (targetMember.role === "OWNER") {
      return res.status(400).json({
        success: false,
        message: "The OWNER role cannot be changed here",
      });
    }

    const updatedMember = await prisma.workspaceMember.update({
      where: { id: memberId },
      data: {
        role: validation.data.role,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      message: "Member role updated successfully",
      member: updatedMember,
    });
  } catch (error) {
    console.error("Update member role error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update member role",
    });
  }
};

// 8. REMOVE MEMBER
export const removeWorkspaceMember = async (req, res) => {
  try {
    const { workspaceId, memberId } = req.params;
    const membership = await getMembership(workspaceId, req.user.id);

    if (!membership || !canManageWorkspace(membership.role)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to remove members",
      });
    }

    const targetMember = await prisma.workspaceMember.findFirst({
      where: {
        id: memberId,
        workspaceId,
      },
    });

    if (!targetMember) {
      return res.status(404).json({
        success: false,
        message: "Workspace member not found",
      });
    }

    if (targetMember.role === "OWNER") {
      return res.status(400).json({
        success: false,
        message: "The workspace OWNER cannot be removed",
      });
    }

    if (
      membership.role === "ADMIN" &&
      targetMember.role === "ADMIN"
    ) {
      return res.status(403).json({
        success: false,
        message: "ADMIN cannot remove another ADMIN",
      });
    }

    await prisma.workspaceMember.delete({
      where: { id: memberId },
    });

    return res.status(200).json({
      success: true,
      message: "Member removed successfully",
    });
  } catch (error) {
    console.error("Remove member error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to remove member",
    });
  }
};
