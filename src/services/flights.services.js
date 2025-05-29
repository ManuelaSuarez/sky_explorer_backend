// flights.services.js

import { Flight } from "../models/Flight.js";
import { Op } from "sequelize";

export const getFlights = async (req, res) => {
  try {
    const { origin, destination, departureDate, airline, sort } = req.query;

    const whereClause = {};
    let orderClause = [["basePrice", "ASC"]];

    if (origin) {
      // ELIMINA LA PARTE .split(" (")[0];
      // Usa la cadena completa del aeropuerto tal como viene del frontend
      whereClause.origin = { [Op.like]: `${origin}%` };
      // Si necesitas insensibilidad a mayúsculas/minúsculas y la base de datos es sensible:
      // whereClause.origin = sequelize.where(sequelize.fn('lower', sequelize.col('origin')), {
      //   [Op.like]: `${origin.toLowerCase()}%`
      // });
    }

    if (destination) {
      // ELIMINA LA PARTE .split(" (")[0];
      // Usa la cadena completa del aeropuerto tal como viene del frontend
      whereClause.destination = { [Op.like]: `${destination}%` };
      // Si necesitas insensibilidad a mayúsculas/minúsculas y la base de datos es sensible:
      // whereClause.destination = sequelize.where(sequelize.fn('lower', sequelize.col('destination')), {
      //   [Op.like]: `${destination.toLowerCase()}%`
      // });
    }

    if (departureDate) {
      whereClause.date = departureDate;
    }

    if (airline) {
      const airlinesToFilter = Array.isArray(airline) ? airline : [airline];
      whereClause.airline = { [Op.in]: airlinesToFilter };
    }

    if (sort) {
      switch (sort) {
        case "priceAsc":
          orderClause = [["basePrice", "ASC"]];
          break;
        case "priceDesc":
          orderClause = [["basePrice", "DESC"]];
          break;
        default:
          orderClause = [["basePrice", "ASC"]];
      }
    }

    // --- BLOQUE DE DEPURACIÓN (Ayuda a ver qué consulta se está formando) ---
    console.log(
      "Backend recibió solicitud para vuelos con filtros:",
      req.query
    );
    console.log("Cláusula WHERE generada:", whereClause);
    console.log("Cláusula ORDER BY generada:", orderClause);
    // --- FIN BLOQUE DE DEPURACIÓN ---

    const flights = await Flight.findAll({
      where: whereClause,
      order: orderClause,
    });

    console.log(`Backend encontró ${flights.length} vuelos.`);

    // Actualizar el estado si el vuelo ya pasó
    const now = new Date();

    await Promise.all(
      flights.map(async (flight) => {
        const flightDateTime = new Date(
          `${flight.date}T${flight.departureTime}`
        );
        if (flightDateTime < now && flight.status === "Activo") {
          flight.status = "Inactivo";
          await flight.save(); // actualiza en la base de datos
        }
      })
    );

    return res.json(flights);
  } catch (error) {
    console.error("Error al obtener vuelos en el backend (getFlights):", error);
    return res.status(500).json({
      message: "Error al obtener los vuelos desde el servidor.",
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};

// ... (rest of your service functions) ...
export const getFlightById = async (req, res) => {
  const { id } = req.params;
  try {
    const flight = await Flight.findByPk(id);
    if (!flight) {
      return res.status(404).json({ message: "Vuelo no encontrado" });
    }
    return res.json(flight);
  } catch (error) {
    console.error("Error al obtener vuelo por ID:", error);
    return res.status(500).json({
      message: "Error al obtener el vuelo por ID",
      error: error.message,
    });
  }
};

export const createFlight = async (req, res) => {
  try {
    const {
      airline,
      origin,
      destination,
      date,
      departureTime,
      arrivalTime,
      capacity,
      basePrice,
    } = req.body;

    if (
      !airline ||
      !origin ||
      !destination ||
      !date ||
      !departureTime ||
      !arrivalTime ||
      !capacity ||
      !basePrice
    ) {
      return res
        .status(400)
        .json({ message: "Todos los campos son obligatorios" });
    }

    const newFlight = await Flight.create({
      airline,
      origin,
      destination,
      date,
      departureTime,
      arrivalTime,
      capacity: Number(capacity),
      basePrice: Number(basePrice),
      status: "Activo",
      purchaseDate: new Date().toISOString().split("T")[0],
      createdBy: req.user ? req.user.id : null,
    });

    res.status(201).json(newFlight);
  } catch (error) {
    console.error("Error al crear vuelo:", error);
    res
      .status(500)
      .json({ message: "Error al crear el vuelo", error: error.message });
  }
};

export const updateFlight = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      airline,
      origin,
      destination,
      date,
      departureTime,
      arrivalTime,
      capacity,
      basePrice,
    } = req.body;

    if (
      !airline ||
      !origin ||
      !destination ||
      !date ||
      !departureTime ||
      !arrivalTime ||
      !capacity ||
      !basePrice
    ) {
      return res
        .status(400)
        .json({ message: "Todos los campos son obligatorios" });
    }

    const flight = await Flight.findByPk(id);
    if (!flight) {
      return res.status(404).json({ message: "Vuelo no encontrado" });
    }

    await flight.update({
      airline,
      origin,
      destination,
      date,
      departureTime,
      arrivalTime,
      capacity: Number(capacity),
      basePrice: Number(basePrice),
    });

    res.json(flight);
  } catch (error) {
    console.error("Error al actualizar vuelo:", error);
    res
      .status(500)
      .json({ message: "Error al actualizar el vuelo", error: error.message });
  }
};

export const deleteFlight = async (req, res) => {
  try {
    const { id } = req.params;
    const flight = await Flight.findByPk(id);
    if (!flight) {
      return res.status(404).json({ message: "Vuelo no encontrado" });
    }
    await flight.destroy();
    res.json({ message: "Vuelo eliminado correctamente" });
  } catch (error) {
    console.error("Error al eliminar vuelo:", error);
    res
      .status(500)
      .json({ message: "Error al eliminar el vuelo", error: error.message });
  }
};

export const toggleFlightStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const flight = await Flight.findByPk(id);
    if (!flight) {
      return res.status(404).json({ message: "Vuelo no encontrado" });
    }
    const newStatus = flight.status === "Activo" ? "Inactivo" : "Activo";
    await flight.update({ status: newStatus });
    res.json({ message: `Estado del vuelo cambiado a ${newStatus}`, flight });
  } catch (error) {
    console.error("Error al cambiar estado del vuelo:", error);
    res.status(500).json({
      message: "Error al cambiar el estado del vuelo",
      error: error.message,
    });
  }
};
