// routes/booking.routes.js - Con middleware de autenticación
import { Router } from "express";
import {
  createBooking,
  getUserBookings,
  getUserBookingsByParam,
  getAllBookings,
  getBookingById
} from "../services/bookings.services.js";
import { verifyToken, checkAdmin } from "../middleware/auth.middleware.js";

const router = Router();

// Crear una nueva reserva (requiere autenticación)
router.post("/bookings", verifyToken, createBooking);

// Obtener las reservas del usuario autenticado
router.get("/bookings/my-bookings", verifyToken, getUserBookings);

// Obtener reservas de un usuario específico (solo admin)
router.get("/bookings/user/:userId", verifyToken, checkAdmin, getUserBookingsByParam);

// Obtener todas las reservas (solo admin)
router.get("/bookings", verifyToken, checkAdmin, getAllBookings);

// Obtener una reserva específica por ID (usuario propietario o admin)
router.get("/bookings/:id", verifyToken, getBookingById);

export default router;