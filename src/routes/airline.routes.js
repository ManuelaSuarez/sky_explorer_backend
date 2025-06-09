import { Router } from "express";
import {
  getAirlines,
  createAirline,
  updateAirline,
  deleteAirline,
} from "../services/airline.services.js";
import { verifyToken, checkAdmin } from "../middleware/auth.middleware.js";

const router = Router();

// Rutas protegidas para la administración de aerolíneas (admin)
router.get("/airlines", verifyToken, checkAdmin, getAirlines);
router.post("/airlines", verifyToken, checkAdmin, createAirline);
router.put("/airlines/:id", verifyToken, checkAdmin, updateAirline);
router.delete("/airlines/:id", verifyToken, checkAdmin, deleteAirline);

export default router;
