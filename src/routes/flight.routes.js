import { Router } from "express";
import {
  getFlights,
  getFlightById,
  createFlight,
  updateFlight,
  deleteFlight,
  toggleFlightStatus,
} from "../services/flights.services.js";
import { verifyToken, isAdmin } from "../middleware/auth.middleware.js";

const router = Router();

// Rutas públicas
router.get("/flights", getFlights);
router.get("/flights/:id", getFlightById);

// Rutas protegidas (solo admin)
router.post("/flights", verifyToken, isAdmin, createFlight);
router.put("/flights/:id", verifyToken, isAdmin, updateFlight);
router.delete("/flights/:id", verifyToken, isAdmin, deleteFlight);
router.patch(
  "/flights/:id/toggle-status",
  verifyToken,
  isAdmin,
  toggleFlightStatus
);

export default router;
