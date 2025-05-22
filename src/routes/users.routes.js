import { Router } from "express";
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  toggleUserStatus,
  changeUserRole
} from "../services/users.services.js";
import { verifyToken, checkAdmin } from "../middleware/auth.middleware.js";

const router = Router();

// Rutas protegidas solo para administradores
router.get("/users", verifyToken, checkAdmin, getUsers);
router.get("/users/:id", verifyToken, checkAdmin, getUserById);
router.post("/users", verifyToken, checkAdmin, createUser);
router.put("/users/:id", verifyToken, checkAdmin, updateUser);
router.delete("/users/:id", verifyToken, checkAdmin, deleteUser);
router.patch("/users/:id/toggle-status", verifyToken, checkAdmin, toggleUserStatus);
router.patch("/users/:id/change-role", verifyToken, checkAdmin, changeUserRole);

export default router;