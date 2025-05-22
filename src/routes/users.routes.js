import { Router } from "express";
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  toggleUserStatus,
  changeUserRole,
} from "../services/users.services.js";
import { verifyToken, isAdmin } from "../middleware/auth.middleware.js";

const router = Router();

// Rutas protegidas solo para administradores
router.get("/users", verifyToken, isAdmin, getUsers);
router.get("/users/:id", verifyToken, isAdmin, getUserById);
router.post("/users", verifyToken, isAdmin, createUser);
router.put("/users/:id", verifyToken, isAdmin, updateUser);
router.delete("/users/:id", verifyToken, isAdmin, deleteUser);
router.patch(
  "/users/:id/toggle-status",
  verifyToken,
  isAdmin,
  toggleUserStatus
);
router.patch("/users/:id/change-role", verifyToken, isAdmin, changeUserRole);

export default router;
