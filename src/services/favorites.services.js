import { Favorite } from "../models/Favorite.js";
import { Flight } from "../models/Flight.js";

// Función para calcular duración entre dos horas
const calculateDuration = (departureTime, arrivalTime) => {
  try {
    const [depHour, depMin] = departureTime.split(':').map(Number);
    const [arrHour, arrMin] = arrivalTime.split(':').map(Number);
    
    const depMinutes = depHour * 60 + depMin;
    let arrMinutes = arrHour * 60 + arrMin;
    
    // Si la hora de llegada es menor, asumimos que es del día siguiente
    if (arrMinutes < depMinutes) {
      arrMinutes += 24 * 60;
    }
    
    const totalMinutes = arrMinutes - depMinutes;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    return `${hours}h ${minutes}m`;
  } catch (error) {
    return "—";
  }
};

/*  POST /api/favorites  */
export const addFavorite = async (req, res) => {
  try {
    const userId = req.user.id;
    const { flightId } = req.body;
    
    if (!flightId) {
      return res.status(400).json({ message: "Faltan datos" });
    }

    const flight = await Flight.findByPk(flightId);
    if (!flight) {
      return res.status(404).json({ message: "Vuelo inexistente" });
    }

    const [_, created] = await Favorite.findOrCreate({
      where: { userId, flightId },
      defaults: { userId, flightId },
    });
    
    if (!created) {
      return res.status(409).json({ message: "Ya está en favoritos" });
    }

    return res.status(201).json({ message: "Agregado a favoritos" });
  } catch (e) {
    console.error("Error en addFavorite:", e);
    res.status(500).json({ message: "Error servidor", error: e.message });
  }
};

/*  DELETE /api/favorites/:flightId  */
export const removeFavorite = async (req, res) => {
  try {
    const userId = req.user.id;
    const flightId = req.params.flightId;

    const rows = await Favorite.destroy({ where: { userId, flightId } });
    
    if (!rows) {
      return res.status(404).json({ message: "No estaba en favoritos" });
    }

    return res.json({ message: "Eliminado de favoritos" });
  } catch (e) {
    console.error("Error en removeFavorite:", e);
    res.status(500).json({ message: "Error servidor", error: e.message });
  }
};

/*  GET /api/favorites  */
export const getMyFavorites = async (req, res) => {
  try {
    const userId = req.user.id;

    const favorites = await Favorite.findAll({
      where: { userId },
      include: [
        {
          model: Flight,
          as: "flight",
          attributes: { exclude: ["createdAt", "updatedAt"] },
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    // Preparamos los vuelos con duración calculada
    const flights = favorites.map(f => {
      const flight = f.flight.toJSON();
      const duration = calculateDuration(flight.departureTime, flight.arrivalTime);
      
      return {
        ...flight,
        duration,
        returnDuration: duration, // Para vuelos de regreso usamos la misma duración
      };
    });

    res.json(flights);
  } catch (e) {
    console.error("Error en getMyFavorites:", e);
    res.status(500).json({ message: "Error servidor", error: e.message });
  }
};