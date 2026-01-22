import { Router } from "express";
import {
  getFlights,
  getFlightById,
  createFlight,
  updateFlight,
  deleteFlight,
  toggleFlightStatus,
  getFeaturedFlights,
  getAllFlights, 
} from "../services/flights.services.js";

import {
  verifyToken,
  checkAdminOrAirline,
} from "../middleware/auth.middleware.js";

import { uploadFlight } from "../middleware/upload.middleware.js";

const router = Router();

// Públicas
router.get("/flights/featured", getFeaturedFlights); 
router.get("/flights/all", verifyToken, checkAdminOrAirline, getAllFlights); 
router.get("/flights/:id", getFlightById); 
router.get("/flights", getFlights); 

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