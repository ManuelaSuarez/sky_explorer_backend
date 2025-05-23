// routes/flight.routes.js
import { Router } from "express"
import {
  getFlights,
  getFlightById,
  createFlight,
  updateFlight,
  deleteFlight,
  toggleFlightStatus,
} from "../services/flights.services.js"
// IMPORTANTE: Importa el nuevo middleware 'checkAdminOrAirline'
import { verifyToken, checkAdminOrAirline } from "../middleware/auth.middleware.js"

const router = Router()

// Rutas públicas
router.get("/flights", getFlights)
router.get("/flights/:id", getFlightById)

// Rutas protegidas para administración de vuelos (ahora para admin Y aerolíneas)
router.post("/flights", verifyToken, checkAdminOrAirline, createFlight)
router.put("/flights/:id", verifyToken, checkAdminOrAirline, updateFlight)
router.delete("/flights/:id", verifyToken, checkAdminOrAirline, deleteFlight)
router.patch("/flights/:id/toggle-status", verifyToken, checkAdminOrAirline, toggleFlightStatus)

export default router