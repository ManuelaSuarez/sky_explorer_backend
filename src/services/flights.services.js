import { Flight } from "../models/Flight.js";
import { Op } from "sequelize";

// Función para calcular duración entre dos horas
const calculateDuration = (departureTime, arrivalTime) => {
  try {
    const [depHour, depMin] = departureTime.split(':').map(Number);
    const [arrHour, arrMin] = arrivalTime.split(':').map(Number);

    const depMinutes = depHour * 60 + depMin;
    let arrMinutes = arrHour * 60 + arrMin;

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

// Obtener TODOS los vuelos (para administración)
export const getAllFlights = async (req, res) => {
  try {
    const flights = await Flight.findAll({
      order: [["createdAt", "DESC"]],
    });

    // Actualizar estado de vuelos pasados
    const now = new Date();
    await Promise.all(
      flights.map(async (flight) => {
        const flightDateTime = new Date(`${flight.date}T${flight.departureTime}`);
        if (flightDateTime < now && flight.status === "Activo") {
          flight.status = "Inactivo";
          await flight.save();
        }
      })
    );

    const flightsWithDuration = flights.map((flight) => {
      const flightData = flight.toJSON();
      const duration = calculateDuration(flightData.departureTime, flightData.arrivalTime);
      return {
        ...flightData,
        duration,
        returnDuration: duration,
      };
    });

    console.log("Todos los vuelos (admin) cargados:", flightsWithDuration.length);
    return res.json(flightsWithDuration);
  } catch (error) {
    console.error("Error al obtener todos los vuelos:", error.message);
    return res.status(500).json({
      message: "Error al obtener los vuelos",
      error: error.message,
    });
  }
};

// VUELOS DESTACADOS - Movido al principio
export const getFeaturedFlights = async (_req, res) => {
  try {
    const flights = await Flight.findAll({
      where: { 
        isFeatured: true,
        status: "Activo"
      },
      attributes: ["id", "origin", "destination", "basePrice", "imageUrl", "airline","date"],
      limit: 6,
    });
    
    console.log("Vuelos destacados encontrados:", flights.length);
    res.json(flights);
  } catch (error) {
    console.error("Error en getFeaturedFlights:", error.message);
    console.error("Stack:", error.stack);
    res.status(500).json({ 
      message: "Error al cargar destacados",
      error: error.message 
    });
  }
};

// Obtener todos los vuelos (con filtros y orden)
export const getFlights = async (req, res) => {
  try {
    let { origin, destination, departureDate, airline, sort } = req.query;

    // Decodificar parámetros (importante si hay tildes o espacios)
    origin = origin ? decodeURIComponent(origin) : null;
    destination = destination ? decodeURIComponent(destination) : null;
    departureDate = departureDate ? decodeURIComponent(departureDate) : null;

    const whereClause = {
      status: "Activo"
    };

    let orderClause = [["basePrice", "ASC"]];

    // Filtros
    if (origin) {
      whereClause.origin = { [Op.like]: `%${origin}%` };
    }

    if (destination) {
      whereClause.destination = { [Op.like]: `%${destination}%` };
    }

    if (departureDate) {
      // Asegurar formato correcto YYYY-MM-DD
      const parsedDate = new Date(departureDate).toISOString().split("T")[0];
      whereClause.date = parsedDate;
    }

    if (airline) {
      const airlinesToFilter = Array.isArray(airline) ? airline : [airline];
      whereClause.airline = { [Op.in]: airlinesToFilter };
    }

    // Orden
    if (sort) {
      switch (sort) {
        case "priceAsc":
          orderClause = [["basePrice", "ASC"]];
          break;
        case "priceDesc":
          orderClause = [["basePrice", "DESC"]];
          break;
        default:
          break;
      }
    }

    // Buscar vuelos
    const flights = await Flight.findAll({
      where: whereClause,
      order: orderClause,
    });

    // Actualizar estado de vuelos pasados
    const now = new Date();
    await Promise.all(
      flights.map(async (flight) => {
        const flightDateTime = new Date(`${flight.date}T${flight.departureTime}`);
        if (flightDateTime < now && flight.status === "Activo") {
          flight.status = "Inactivo";
          await flight.save();
        }
      })
    );

    // Calcular duración
    const flightsWithDuration = flights.map((flight) => {
      const flightData = flight.toJSON();
      const duration = calculateDuration(flightData.departureTime, flightData.arrivalTime);
      return {
        ...flightData,
        duration,
        returnDuration: duration,
      };
    });

    console.log("Vuelos filtrados cargados:", flightsWithDuration.length);
    return res.json(flightsWithDuration);
  } catch (error) {
    console.error("Error al obtener vuelos:", error.message);
    console.error("Stack:", error.stack);
    return res.status(500).json({
      message: "Error al obtener los vuelos",
      error: error.message,
    });
  }
};


// Obtener vuelo por ID
export const getFlightById = async (req, res) => {
  const { id } = req.params;
  try {
    const flight = await Flight.findByPk(id);
    if (!flight) {
      return res.status(404).json({ message: "Vuelo no encontrado" });
    }

    const flightData = flight.toJSON();
    const duration = calculateDuration(flightData.departureTime, flightData.arrivalTime);

    return res.json({
      ...flightData,
      duration,
      returnDuration: duration,
    });
  } catch (error) {
    console.error("Error al obtener vuelo por ID:", error.message);
    return res.status(500).json({
      message: "Error al obtener el vuelo por ID",
      error: error.message,
    });
  }
};

// Crear vuelo (con imagen y destacado)
export const createFlight = async (req, res) => {
  try {
    const {
      airline, origin, destination, date,
      departureTime, arrivalTime, capacity, basePrice, isFeatured
    } = req.body;

    console.log("Creando vuelo con datos:", { airline, origin, destination, isFeatured });

    const imageUrl = req.file ? `/uploads/flights/${req.file.filename}` : null;

    const flight = await Flight.create({
      airline, 
      origin, 
      destination, 
      date,
      departureTime, 
      arrivalTime, 
      capacity: Number(capacity), 
      basePrice: Number(basePrice),
      isFeatured: isFeatured === "true" || isFeatured === true,
      imageUrl,
      createdBy: req.user.id,
    });

    const flightData = flight.toJSON();
    const duration = calculateDuration(flightData.departureTime, flightData.arrivalTime);

    console.log("✅ Vuelo creado exitosamente:", flight.id);

    if (!airline || !origin || !destination || !date || !departureTime || !arrivalTime) {
      return res.status(400).json({ message: "Todos los campos son obligatorios." });
    }

    // Validar capacidad y precio
    if (capacity <= 0) {
      return res.status(400).json({ message: "La capacidad del vuelo debe ser mayor a 0." });
    }

    if (basePrice <= 0) {
      return res.status(400).json({ message: "El precio base debe ser mayor a 0." });
    }

    res.status(201).json({
      ...flightData,
      duration,
      returnDuration: duration,
    });
  } catch (error) {
    console.error("Error al crear vuelo:", error.message);
    console.error("Stack:", error.stack);
    return res.status(500).json({
      message: "Error al crear el vuelo",
      error: error.message,
    });
  }
};

// Actualizar vuelo
export const updateFlight = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      airline, origin, destination, date,
      departureTime, arrivalTime, capacity, basePrice, isFeatured
    } = req.body;

    const flight = await Flight.findByPk(id);
    if (!flight) {
      return res.status(404).json({ message: "Vuelo no encontrado" });
    }

    if (req.user?.role === "airline" && req.user.name !== flight.airline) {
      return res.status(403).json({ message: "No tienes permiso para editar este vuelo." });
    }

        // Validar campos requeridos
    if (!airline || !origin || !destination || !date || !departureTime || !arrivalTime) {
      return res.status(400).json({ message: "Todos los campos son obligatorios." });
    }

    // Validar capacidad y precio
    if (capacity <= 0) {
      return res.status(400).json({ message: "La capacidad del vuelo debe ser mayor a 0." });
    }

    if (basePrice <= 0) {
      return res.status(400).json({ message: "El precio base debe ser mayor a 0." });
    }


    // Actualizar imagen solo si se envió una nueva
    const updateData = {
      airline, 
      origin, 
      destination, 
      date,
      departureTime, 
      arrivalTime, 
      capacity: Number(capacity), 
      basePrice: Number(basePrice),
      isFeatured: isFeatured === "true" || isFeatured === true,
    };

    // Si hay nueva imagen, actualizarla
    if (req.file) {
      updateData.imageUrl = `/uploads/flights/${req.file.filename}`;
    }

    await flight.update(updateData);

    const flightData = flight.toJSON();
    const duration = calculateDuration(flightData.departureTime, flightData.arrivalTime);

    console.log("✅ Vuelo actualizado:", id);

    res.json({
      ...flightData,
      duration,
      returnDuration: duration,
    });
  } catch (error) {
    console.error("❌ Error al actualizar vuelo:", error.message);
    return res.status(500).json({
      message: "Error al actualizar el vuelo",
      error: error.message,
    });
  }
};

// Eliminar vuelo
export const deleteFlight = async (req, res) => {
  try {
    const { id } = req.params;

    const flight = await Flight.findByPk(id);
    if (!flight) {
      return res.status(404).json({ message: "Vuelo no encontrado" });
    }

    if (req.user?.role === "airline" && req.user.name !== flight.airline) {
      return res.status(403).json({ message: "No tienes permiso para eliminar este vuelo." });
    }

    await flight.destroy();
    console.log("✅ Vuelo eliminado:", id);
    res.json({ message: "Vuelo eliminado correctamente" });
  } catch (error) {
    console.error("❌ Error al eliminar vuelo:", error.message);
    return res.status(500).json({
      message: "Error al eliminar el vuelo",
      error: error.message,
    });
  }
};

// Cambiar estado de vuelo
export const toggleFlightStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const flight = await Flight.findByPk(id);
    if (!flight) {
      return res.status(404).json({ message: "Vuelo no encontrado" });
    }

    const newStatus = flight.status === "Activo" ? "Inactivo" : "Activo";
    await flight.update({ status: newStatus });

    const flightData = flight.toJSON();
    const duration = calculateDuration(flightData.departureTime, flightData.arrivalTime);

    console.log("✅ Estado cambiado:", id, newStatus);

    res.json({
      message: `Estado del vuelo cambiado a ${newStatus}`,
      flight: {
        ...flightData,
        duration,
        returnDuration: duration,
      },
    });
  } catch (error) {
    console.error("❌ Error al cambiar estado del vuelo:", error.message);
    return res.status(500).json({
      message: "Error al cambiar el estado del vuelo",
      error: error.message,
    });
  }
};