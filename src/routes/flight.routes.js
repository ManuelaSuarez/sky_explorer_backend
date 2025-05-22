import { Router } from "express"
import {
  getFlights,
  getFlightById,
  createFlight,
  updateFlight,
  deleteFlight,
  toggleFlightStatus,
} from "../services/flights.services.js"
import { verifyToken } from "../middleware/auth.middleware.js"
import { checkAdmin } from "../middleware/auth.middleware.js"

const router = Router()

// Rutas públicas
router.get("/flights", getFlights)
router.get("/flights/:id", getFlightById)

// Rutas protegidas (solo admin)
router.post("/flights", verifyToken, checkAdmin, createFlight)
router.put("/flights/:id", verifyToken, checkAdmin, updateFlight)
router.delete("/flights/:id", verifyToken, checkAdmin, deleteFlight)
router.patch("/flights/:id/toggle-status", verifyToken, checkAdmin, toggleFlightStatus)

export default router
