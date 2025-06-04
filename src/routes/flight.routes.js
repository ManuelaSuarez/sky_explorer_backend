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
router.get("/flights", getFlights) //Devuelve la lista de vuelos.
router.get("/flights/:id", getFlightById) // Devuelve la información de un vuelo específico por su id.

// Rutas protegidas para administración de vuelos (ahora para admin Y aerolíneas)
router.post("/flights", verifyToken, checkAdminOrAirline, createFlight) //Crear un nuevo vuelo.
router.put("/flights/:id", verifyToken, checkAdminOrAirline, updateFlight) //Actualizar un vuelo existente.
router.delete("/flights/:id", verifyToken, checkAdminOrAirline, deleteFlight) //Eliminar un vuelo.
router.patch("/flights/:id/toggle-status", verifyToken, checkAdminOrAirline, toggleFlightStatus) // Cambiar el estado del vuelo (por ejemplo, activarlo/desactivarlo).

export default router