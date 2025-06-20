import { Flight } from "../models/Flight.js";
import { Op } from "sequelize";

export const getFlights = async (req, res) => {
  try {
    const { origin, destination, departureDate, airline, sort } = req.query;

    const whereClause = {};
    let orderClause = [["basePrice", "ASC"]];

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

    // Actualiza el estado de los vuelos que ya pasaron.
    const now = new Date();
    await Promise.all(
      flights.map(async (flight) => {
        const flightDateTime = new Date(
          `${flight.date}T${flight.departureTime}`
        );
        if (flightDateTime < now && flight.status === "Activo") {
          flight.status = "Inactivo";
          await flight.save();
        }
      })
    );

    return res.json(flights);
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
    let {
      airline,
      origin,
      destination,
      date,
      departureTime,
      arrivalTime,
      capacity,
      basePrice,
    } = req.body;

    if (req.user?.role === "airline") {
      // Si viene un airline distinto al del usuario se bloquea
      if (airline && airline !== req.user.name) {
        return res
          .status(403)
          .json({ message: "No puedes crear vuelos para otra aerolínea." });
      }
      airline = req.user.name;
    }

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
    if (res) {
      res
        .status(500)
        .json({ message: "Error al crear el vuelo", error: error.message });
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
      return res
        .status(400)
        .json({ message: "Todos los campos son obligatorios" });
    }

    const flight = await Flight.findByPk(id);
    if (!flight) {
      return res.status(404).json({ message: "Vuelo no encontrado" });
    }

    // Seguridad: solo el admin o la aerolínea propietaria puede editar
    if (req.user?.role === "airline" && req.user.name !== flight.airline) {
      return res
        .status(403)
        .json({ message: "No tienes permiso para editar este vuelo." });
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
      res.status(500).json({
        message: "Error al actualizar el vuelo",
        error: error.message,
      });
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

    if (req.user?.role === "airline" && req.user.name !== flight.airline) {
      return res
        .status(403)
        .json({ message: "No tienes permiso para eliminar este vuelo." });
    }

    await flight.destroy();
    res.json({ message: "Vuelo eliminado correctamente" });
  } catch (error) {
    console.error("Error al eliminar vuelo:", error);
    if (res) {
      res
        .status(500)
        .json({ message: "Error al eliminar el vuelo", error: error.message });
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
