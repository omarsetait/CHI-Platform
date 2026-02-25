import { Router, Request, Response } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { insertUserSchema } from "@shared/schema";
import { hashPassword, verifyPassword, sanitizeUserOutput, requireAuth } from "../middleware/auth";
import { handleRouteError } from "../utils/route-utils";
import { createAuditLog } from "../middleware/audit";

const router = Router();

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = insertUserSchema.extend({
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

router.post("/register", async (req: Request, res: Response) => {
  try {
    const validatedData = registerSchema.parse(req.body);
    const { confirmPassword, ...userData } = validatedData;

    const existingUserByEmail = await storage.getUserByEmail(userData.email);
    if (existingUserByEmail) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }

    const existingUserByUsername = await storage.getUserByUsername(userData.username);
    if (existingUserByUsername) {
      res.status(409).json({ error: "Username already taken" });
      return;
    }

    const hashedPassword = await hashPassword(userData.password);
    const user = await storage.createUser({
      ...userData,
      password: hashedPassword,
      role: userData.role || "viewer",
    });

    await createAuditLog({
      userId: user.id,
      action: "USER_REGISTERED",
      resourceType: "user",
      resourceId: user.id,
      ipAddress: req.ip || req.socket.remoteAddress,
      userAgent: req.get("User-Agent"),
      details: { username: user.username, email: user.email },
    });

    req.session.userId = user.id;

    res.status(201).json({ 
      message: "Registration successful",
      user: sanitizeUserOutput(user)
    });
  } catch (error) {
    handleRouteError(error, res, "auth", "register");
  }
});

router.post("/login", async (req: Request, res: Response) => {
  try {
    const validatedData = loginSchema.parse(req.body);

    const user = await storage.getUserByEmail(validatedData.email);
    if (!user) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({ error: "Account is disabled" });
      return;
    }

    const isPasswordValid = await verifyPassword(validatedData.password, user.password);
    if (!isPasswordValid) {
      await createAuditLog({
        action: "LOGIN_FAILED",
        resourceType: "user",
        resourceId: user.id,
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.get("User-Agent"),
        details: { reason: "Invalid password", email: validatedData.email },
      });

      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    await storage.updateUserLastLogin(user.id);

    req.session.userId = user.id;

    await createAuditLog({
      userId: user.id,
      action: "LOGIN_SUCCESS",
      resourceType: "user",
      resourceId: user.id,
      ipAddress: req.ip || req.socket.remoteAddress,
      userAgent: req.get("User-Agent"),
      details: { email: user.email },
    });

    res.json({ 
      message: "Login successful",
      user: sanitizeUserOutput(user)
    });
  } catch (error) {
    handleRouteError(error, res, "auth", "login");
  }
});

router.post("/logout", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId;

    await createAuditLog({
      userId: userId,
      action: "LOGOUT",
      resourceType: "user",
      resourceId: userId,
      ipAddress: req.ip || req.socket.remoteAddress,
      userAgent: req.get("User-Agent"),
    });

    req.session.destroy((err) => {
      if (err) {
        console.error("Session destruction error:", err);
        res.status(500).json({ error: "Logout failed" });
        return;
      }
      res.clearCookie("connect.sid");
      res.json({ message: "Logout successful" });
    });
  } catch (error) {
    handleRouteError(error, res, "auth", "logout");
  }
});

router.get("/me", requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const user = await storage.getUser(req.user.id);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({ user: sanitizeUserOutput(user) });
  } catch (error) {
    handleRouteError(error, res, "auth", "me");
  }
});

router.get("/csrf-token", (req: Request, res: Response) => {
  const csrfToken = req.session.csrfToken || generateCsrfToken();
  req.session.csrfToken = csrfToken;
  res.json({ csrfToken });
});

function generateCsrfToken(): string {
  const crypto = require("crypto");
  return crypto.randomBytes(32).toString("hex");
}

export default router;
