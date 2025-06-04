import { Flight } from "../models/Flight.js";
import { Op } from "sequelize";

export const getFlights = async (req, res) => {
  try {
    const { origin, destination, departureDate, airline, sort } = req.query;

    const whereClause = {};
    let orderClause = [["basePrice", "ASC"]]; // Orden por defecto: precio ascendente

    whereClause.status = "Activo";

    if (origin) {
      whereClause.origin = { [Op.like]: `${origin}%` };
    }

    if (destination) {
      whereClause.destination = { [Op.like]: `${destination}%` };
    }

    if (departureDate) {
      // Asegurarse de que la fecha coincida exactamente
      whereClause.date = departureDate;
    }

    if (airline) {
      const airlinesToFilter = Array.isArray(airline) ? airline : [airline];
      whereClause.airline = { [Op.in]: airlinesToFilter };
    }

    // Lógica de ordenamiento
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

    const flights = await Flight.findAll({
      where: whereClause,
      order: orderClause,
    });

    // Esta sección actualiza el estado de los vuelos que ya pasaron.
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

    return res.json(flights); // Devuelve los vuelos que cumplen el criterio original (status: "Activo")
  } catch (error) {
    console.error("Error al obtener vuelos en el backend (getFlights):", error);
    if (res) {
      return res.status(500).json({
        message: "Error al obtener los vuelos desde el servidor.",
        error: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      });
    } else {
      console.error("No se pudo enviar respuesta de error: 'res' no definido.");
      throw error;
    }
  }
};

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
    if (res) {
      return res.status(500).json({
        message: "Error al obtener el vuelo por ID",
        error: error.message,
      });
    } else {
      console.error("No se pudo enviar respuesta de error: 'res' no definido.");
      throw error;
    }
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

    // Validación de campos obligatorios
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
      return res.status(400).json({ message: "Todos los campos son obligatorios" });
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
      status: "Activo", // Por defecto, un nuevo vuelo es activo
      purchaseDate: new Date().toISOString().split("T")[0], // Fecha de compra al momento de crear
      createdBy: req.user ? req.user.id : null, // Asumiendo que 'req.user' puede contener el ID del usuario
    });

    res.status(201).json(newFlight);
  } catch (error) {
    console.error("Error al crear vuelo:", error);
    if (res) {
      res.status(500).json({ message: "Error al crear el vuelo", error: error.message });
    } else {
      console.error("No se pudo enviar respuesta de error: 'res' no definido.");
      throw error;
    }
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

    // Validación de campos obligatorios para la actualización
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
      return res.status(400).json({ message: "Todos los campos son obligatorios" });
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
    if (res) {
      res.status(500).json({ message: "Error al actualizar el vuelo", error: error.message });
    } else {
      console.error("No se pudo enviar respuesta de error: 'res' no definido.");
      throw error;
    }
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
    if (res) {
      res.status(500).json({ message: "Error al eliminar el vuelo", error: error.message });
    } else {
      console.error("No se pudo enviar respuesta de error: 'res' no definido.");
      throw error;
    }
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
    if (res) {
      res.status(500).json({
        message: "Error al cambiar el estado del vuelo",
        error: error.message,
      });
    } else {
      console.error("No se pudo enviar respuesta de error: 'res' no definido.");
      throw error;
    }
  }
};