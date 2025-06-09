import { Router } from "express";
import {
  createBooking,
  getUserBookings,
  getBookingById,
} from "../services/bookings.services.js";
import { verifyToken } from "../middleware/auth.middleware.js";

const router = Router();

// Crear una nueva reserva (user logueado)
router.post("/bookings", verifyToken, createBooking);

// Obtener las reservas del usuario (solo el usuario)
router.get("/bookings/my-bookings", verifyToken, getUserBookings);

// Obtener una reserva específica por ID (solo el usuario)
router.get("/bookings/:id", verifyToken, getBookingById);

export default router;
