import { Router } from "express";
import {
  loginUser,
  registerUser,
  verifyUserToken,
  verifyToken,
} from "../services/auth.services.js";

const router = Router();

// Rutas de autenticación
router.post("/register", registerUser);
router.post("/login", loginUser);

// Ruta para verificar el token y obtener información del usuario
router.get("/verify", verifyToken, verifyUserToken);

export default router;
