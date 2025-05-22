import { Flight } from "../models/Flight.js";
import { User } from "../models/User.js";

// Obtener todos los vuelos
export const getFlights = async (req, res) => {
  try {
    const flights = await Flight.findAll({
      order: [["id", "DESC"]],
      include: [
        {
          model: User,
          as: "creator",
          attributes: ["id", "email", "name"],
        },
      ],
    });

    return res.json(flights);
  } catch (error) {
    console.error("Error al obtener vuelos:", error);
    return res.status(500).json({
      message: "Error al obtener los vuelos",
      error: error.message,
    });
  }
};

// Obtener un vuelo por ID
export const getFlightById = async (req, res) => {
  const { id } = req.params;

  try {
    const flight = await Flight.findByPk(id, {
      include: [
        {
          model: User,
          as: "creator",
          attributes: ["id", "email", "name"],
        },
      ],
    });

    if (!flight) {
      return res.status(404).json({ message: "Vuelo no encontrado" });
    }

    return res.json(flight);
  } catch (error) {
    console.error("Error al obtener vuelo:", error);
    return res.status(500).json({
      message: "Error al obtener el vuelo",
      error: error.message,
    });
  }
};

// Crear un nuevo vuelo
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

    // Validar campos requeridos
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

    // Crear el vuelo con estado "Activo" por defecto y asignar el creador
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
      purchaseDate: new Date().toISOString().split("T")[0], // Fecha actual como fecha de compra
      createdBy: req.user ? req.user.id : null, // Asignar el ID del usuario que crea el vuelo
    });

    // Obtener el vuelo recién creado con la información del creador
    const flightWithCreator = await Flight.findByPk(newFlight.id, {
      include: [
        {
          model: User,
          as: "creator",
          attributes: ["id", "email", "name"],
        },
      ],
    });

    res.status(201).json(flightWithCreator);
  } catch (error) {
    console.error("Error al crear vuelo:", error);
    res
      .status(500)
      .json({ message: "Error al crear el vuelo", error: error.message });
  }
};

// Actualizar un vuelo existente
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

    // Validar campos requeridos
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

    // Verificar si el vuelo existe
    const flight = await Flight.findByPk(id);
    if (!flight) {
      return res.status(404).json({ message: "Vuelo no encontrado" });
    }

    // Actualizar el vuelo
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

    // Obtener el vuelo actualizado con la información del creador
    const updatedFlight = await Flight.findByPk(id, {
      include: [
        {
          model: User,
          as: "creator",
          attributes: ["id", "email", "name"],
        },
      ],
    });

    res.json(updatedFlight);
  } catch (error) {
    console.error("Error al actualizar vuelo:", error);
    res
      .status(500)
      .json({ message: "Error al actualizar el vuelo", error: error.message });
  }
};

// Eliminar un vuelo
export const deleteFlight = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar si el vuelo existe
    const flight = await Flight.findByPk(id);
    if (!flight) {
      return res.status(404).json({ message: "Vuelo no encontrado" });
    }

    // Eliminar el vuelo
    await flight.destroy();

    res.json({ message: "Vuelo eliminado correctamente", id });
  } catch (error) {
    console.error("Error al eliminar vuelo:", error);
    res
      .status(500)
      .json({ message: "Error al eliminar el vuelo", error: error.message });
  }
};

// Cambiar el estado de un vuelo (Activo/Inactivo)
export const toggleFlightStatus = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar si el vuelo existe
    const flight = await Flight.findByPk(id);
    if (!flight) {
      return res.status(404).json({ message: "Vuelo no encontrado" });
    }

    // Cambiar el estado del vuelo (de Activo a Inactivo o viceversa)
    const newStatus = flight.status === "Activo" ? "Inactivo" : "Activo";
    await flight.update({ status: newStatus });

    // Obtener el vuelo actualizado con la información del creador
    const updatedFlight = await Flight.findByPk(id, {
      include: [
        {
          model: User,
          as: "creator",
          attributes: ["id", "email", "name"],
        },
      ],
    });

    res.json({
      message: `Estado del vuelo cambiado a ${newStatus}`,
      flight: updatedFlight,
    });
  } catch (error) {
    console.error("Error al cambiar estado del vuelo:", error);
    res
      .status(500)
      .json({
        message: "Error al cambiar el estado del vuelo",
        error: error.message,
      });
  }
};
