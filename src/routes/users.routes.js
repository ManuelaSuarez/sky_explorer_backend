import { Router } from "express";
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getMyProfile,
  updateUserProfile,
  deleteUserProfileWithBookings,
} from "../services/users.services.js";
import { verifyToken, checkAdmin } from "../middleware/auth.middleware.js";
import upload from "../middleware/upload.middleware.js"; // Importa el middleware de subida

const router = Router();

// Rutas para usuario regular
router.get("/users/profile/me", verifyToken, getMyProfile);
// Usar `upload.single` para procesar el archivo 'profilePicture'
router.put("/users/profile/me", verifyToken, upload.single("profilePicture"), updateUserProfile);
router.delete(
  "/users/profile/me/with-bookings",
  verifyToken,
  deleteUserProfileWithBookings
);

// Rutas para admin
router.get("/users", verifyToken, checkAdmin, getUsers);
router.get("/users/:id", verifyToken, checkAdmin, getUserById);
router.post("/users", verifyToken, checkAdmin, createUser);
router.put("/users/:id", verifyToken, checkAdmin, updateUser);
router.delete("/users/:id", verifyToken, checkAdmin, deleteUser);

export default router;