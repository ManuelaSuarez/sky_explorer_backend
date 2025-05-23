// routes/airline.routes.js
import { Router } from "express";
import {
  getAirlines,
  createAirline,
  updateAirline,
  deleteAirline,
} from "../services/airline.services.js";
import { verifyToken, checkAdmin } from "../middleware/auth.middleware.js"; // Importa los middlewares

const router = Router();

// Rutas protegidas para la administración de aerolíneas
// Solo un administrador debería poder realizar estas operaciones
router.get("/airlines", verifyToken, checkAdmin, getAirlines);
router.post("/airlines", verifyToken, checkAdmin, createAirline);
router.put("/airlines/:id", verifyToken, checkAdmin, updateAirline);
router.delete("/airlines/:id", verifyToken, checkAdmin, deleteAirline);

export default router;