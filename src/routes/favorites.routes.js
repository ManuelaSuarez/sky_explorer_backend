import { Router } from "express";
import { addFavorite, removeFavorite, getMyFavorites } from "../services/favorites.services.js";
import { verifyToken } from "../middleware/auth.middleware.js";

const router = Router();

// Todas las rutas necesitan autenticación
router.use(verifyToken);

// POST /api/favorites - Agregar a favoritos
router.post("/favorites", addFavorite);

// DELETE /api/favorites/:flightId - Quitar de favoritos  
router.delete("/favorites/:flightId", removeFavorite);

// GET /api/favorites - Obtener mis favoritos
router.get("/favorites", getMyFavorites);

export default router;