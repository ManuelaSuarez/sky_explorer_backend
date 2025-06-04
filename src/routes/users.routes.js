import { Router } from "express";
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getMyProfile,
  updateUserProfile,
  deleteUserProfileWithBookings
} from "../services/users.services.js";
import { verifyToken, checkAdmin } from "../middleware/auth.middleware.js";

const router = Router();

// ===== RUTAS PARA USUARIO REGULAR (Autogestión de Perfil) =====
router.get("/users/profile/me", verifyToken, getMyProfile);
router.put("/users/profile/me", verifyToken, updateUserProfile);
router.delete("/users/profile/me/with-bookings", verifyToken, deleteUserProfileWithBookings);

// ===== RUTAS PARA ADMIN (Gestión de Aerolíneas) =====
router.get("/users", verifyToken, checkAdmin, getUsers);
router.get("/users/:id", verifyToken, checkAdmin, getUserById);
router.post("/users", verifyToken, checkAdmin, createUser);
router.put("/users/:id", verifyToken, checkAdmin, updateUser);
router.delete("/users/:id", verifyToken, checkAdmin, deleteUser);

export default router;