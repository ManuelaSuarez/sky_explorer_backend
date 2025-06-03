import { Router } from "express";
import {
  getUsers,
  getUserById,
  createUser,
  updateUser, // Para actualizar OTROS usuarios (por admin)
  updateUserProfile, // Para que el usuario actualice SU PROPIO perfil
  deleteUser, // Para eliminar OTROS usuarios (por admin)
  deleteUserProfile, // Para que el usuario actual elimine SU PROPIO perfil (sin reservas)
  toggleUserStatus,
  changeUserRole,
  getMyProfile, // Para que el usuario obtenga SU PROPIO perfil
  deleteUserProfileWithBookings // Para que el usuario elimine SU PROPIO perfil Y sus reservas
} from "../services/users.services.js";
import { verifyToken, checkAdmin } from "../middleware/auth.middleware.js"; // Middleware para verificar token y rol

const router = Router();

// --- Rutas para el Perfil del Usuario Logueado (Autogestión) ---
// Estas rutas solo necesitan 'verifyToken' porque el usuario interactúa con su propio perfil.
router.get("/users/profile/me", verifyToken, getMyProfile);
router.put("/users/profile/me", verifyToken, updateUserProfile);
router.delete("/users/profile/me", verifyToken, deleteUserProfile);
router.delete("/users/profile/me/with-bookings", verifyToken, deleteUserProfileWithBookings);

// --- Rutas para Administradores (Gestión de otros usuarios) ---
// Estas rutas requieren 'checkAdmin' para asegurar que solo los administradores puedan acceder.
router.get("/users", verifyToken, checkAdmin, getUsers);
router.get("/users/:id", verifyToken, checkAdmin, getUserById);
router.post("/users", verifyToken, checkAdmin, createUser);
router.put("/users/:id", verifyToken, checkAdmin, updateUser); // Actualiza un usuario por ID (admin)
router.delete("/users/:id", verifyToken, checkAdmin, deleteUser); // Elimina un usuario por ID (admin)
router.patch("/users/:id/toggle-status", verifyToken, checkAdmin, toggleUserStatus);
router.patch("/users/:id/change-role", verifyToken, checkAdmin, changeUserRole);

export default router;