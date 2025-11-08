import { Router } from "express";
import {
  getFlights,
  getFlightById,
  createFlight,
  updateFlight,
  deleteFlight,
  toggleFlightStatus,
  getFeaturedFlights,
  getAllFlights, // ← NUEVO
} from "../services/flights.services.js";

import {
  verifyToken,
  checkAdminOrAirline,
} from "../middleware/auth.middleware.js";

import { uploadFlight } from "../middleware/upload.middleware.js";

const router = Router();

// Públicas
router.get("/flights/featured", getFeaturedFlights); // ← PRIMERO las rutas específicas
router.get("/flights/all", verifyToken, checkAdminOrAirline, getAllFlights); // ← ANTES de :id
router.get("/flights/:id", getFlightById); // ← ID al final
router.get("/flights", getFlights); // ← Lista general al final

router.post(
  "/flights",
  verifyToken,
  checkAdminOrAirline,
  uploadFlight.single("image"),
  createFlight
);

router.put(
  "/flights/:id",
  verifyToken,
  checkAdminOrAirline,
  uploadFlight.single("image"),
  updateFlight
);

router.delete("/flights/:id", verifyToken, checkAdminOrAirline, deleteFlight);

router.patch(
  "/flights/:id/toggle-status",
  verifyToken,
  checkAdminOrAirline,
  toggleFlightStatus
);

export default router;