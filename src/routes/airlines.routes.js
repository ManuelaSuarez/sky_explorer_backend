import { Router } from "express";
import {
  createAirline,
  getAllAirlines,
  getAirlineById,
  updateAirline,
  deleteAirline,
} from "../services/airlines.services.js";
import { verifyToken, isAdmin } from "../middleware/auth.middleware.js";

const router = Router();

// Ruta para crear una nueva aerolínea (solo admin)
router.post("/airlines", verifyToken, isAdmin, async (req, res) => {
  try {
    const newAirline = await createAirline(req.body);
    res.status(201).json(newAirline);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Ruta para obtener todas las aerolíneas
router.get("/airlines", verifyToken, async (req, res) => {
  try {
    const airlines = await getAllAirlines();
    res.status(200).json(airlines);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Ruta para obtener una aerolínea por ID
router.get("/airlines/:id", verifyToken, async (req, res) => {
  try {
    const airline = await getAirlineById(req.params.id);
    res.status(200).json(airline);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
});

// Ruta para actualizar una aerolínea (solo admin)
router.put("/airlines/:id", verifyToken, isAdmin, async (req, res) => {
  try {
    const updatedAirline = await updateAirline(req.params.id, req.body);
    res.status(200).json(updatedAirline);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Ruta para eliminar una aerolínea (solo admin)
router.delete("/airlines/:id", verifyToken, isAdmin, async (req, res) => {
  try {
    const result = await deleteAirline(req.params.id);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

export default router;
