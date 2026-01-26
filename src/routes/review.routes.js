import { Router } from "express"
import {
  createReview,
  getReviewsByAirline,
  updateReview,
  deleteReview,
  getAirlineAverageRating,
  getAllReviews,
} from "../services/review.services.js"

import { verifyToken } from "../middleware/auth.middleware.js"

const router = Router()

// Rutas públicas para consultar reseñas
router.get("/reviews", getAllReviews) // Obtener todas las reseñas
router.get("/reviews/airline/:airline", getReviewsByAirline) // Obtener reseñas por aerolínea
router.get("/reviews/airline/:airline/average", getAirlineAverageRating) // Obtener calificación promedio de aerolínea

// Rutas protegidas para usuarios autenticados
router.post("/reviews", verifyToken, createReview) // Crear nueva reseña
router.put("/reviews/:id", verifyToken, updateReview) // Actualizar reseña propia
router.delete("/reviews/:id", verifyToken, deleteReview) // Eliminar reseña propia

export default router
