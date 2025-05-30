// services/bookings.services.js - Con autenticación
import { Booking } from "../models/Booking.js";
import { Flight } from "../models/Flight.js";
import { User } from "../models/User.js";

// Crear una nueva reserva (obteniendo userId del token)
export const createBooking = async (req, res) => {
  try {
    const { flightId, passengers, totalPrice } = req.body;

    // Validar datos requeridos
    if (!flightId || !passengers || !totalPrice || !Array.isArray(passengers)) {
      return res.status(400).json({ 
        message: "Datos de reserva incompletos" 
      });
    }

    // Obtener el userId del usuario autenticado (viene del middleware)
    const userId = req.user.id;

    // Verificar que el vuelo existe
    const flight = await Flight.findByPk(flightId);
    if (!flight) {
      return res.status(404).json({ 
        message: "Vuelo no encontrado" 
      });
    }

    // Crear la reserva con el userId del usuario autenticado
    const booking = await Booking.create({
      userId: userId, // Usar el ID del usuario autenticado
      flightId,
      passengers,
      passengerCount: passengers.length,
      totalPrice,
      status: 'Activo'
    });

    // Obtener la reserva completa con datos del vuelo
    const bookingWithFlight = await Booking.findByPk(booking.id, {
      include: [{
        model: Flight,
        as: 'flight'
      }]
    });

    return res.status(201).json({
      message: "Reserva creada exitosamente",
      booking: bookingWithFlight
    });

  } catch (error) {
    console.error("Error al crear reserva:", error);
    return res.status(500).json({
      message: "Error al procesar la reserva",
      error: error.message
    });
  }
};

// Obtener todas las reservas del usuario autenticado
export const getUserBookings = async (req, res) => {
  try {
    // Obtener el userId del usuario autenticado
    const userId = req.user.id;

    const bookings = await Booking.findAll({
      where: { userId },
      include: [{
        model: Flight,
        as: 'flight'
      }],
      order: [['purchaseDate', 'DESC']]
    });

    // Actualizar el estado basado en la fecha del vuelo
    const today = new Date();
    const updatedBookings = bookings.map(booking => {
      const flightDate = new Date(booking.flight.date);
      const currentStatus = flightDate < today ? 'Inactivo' : 'Activo';
      
      // Actualizar en base de datos si es necesario
      if (booking.status !== currentStatus) {
        booking.update({ status: currentStatus });
      }
      
      return {
        ...booking.toJSON(),
        status: currentStatus
      };
    });

    return res.json(updatedBookings);

  } catch (error) {
    console.error("Error al obtener reservas:", error);
    return res.status(500).json({
      message: "Error al obtener las reservas",
      error: error.message
    });
  }
};

// Obtener reservas de un usuario específico (por parámetro - para admin)
export const getUserBookingsByParam = async (req, res) => {
  try {
    const { userId } = req.params;

    const bookings = await Booking.findAll({
      where: { userId },
      include: [{
        model: Flight,
        as: 'flight'
      }],
      order: [['purchaseDate', 'DESC']]
    });

    return res.json(bookings);

  } catch (error) {
    console.error("Error al obtener reservas:", error);
    return res.status(500).json({
      message: "Error al obtener las reservas",
      error: error.message
    });
  }
};

// Obtener todas las reservas (para admin)
export const getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.findAll({
      include: [
        {
          model: Flight,
          as: 'flight'
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [['purchaseDate', 'DESC']]
    });

    // Actualizar el estado basado en la fecha del vuelo
    const today = new Date();
    const updatedBookings = bookings.map(booking => {
      const flightDate = new Date(booking.flight.date);
      const currentStatus = flightDate < today ? 'Inactivo' : 'Activo';
      
      // Actualizar en base de datos si es necesario
      if (booking.status !== currentStatus) {
        booking.update({ status: currentStatus });
      }
      
      return {
        ...booking.toJSON(),
        status: currentStatus
      };
    });

    return res.json(updatedBookings);

  } catch (error) {
    console.error("Error al obtener todas las reservas:", error);
    return res.status(500).json({
      message: "Error al obtener las reservas",
      error: error.message
    });
  }
};

// Obtener una reserva por ID (solo si pertenece al usuario o es admin)
export const getBookingById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const booking = await Booking.findByPk(id, {
      include: [{
        model: Flight,
        as: 'flight'
      }]
    });

    if (!booking) {
      return res.status(404).json({ 
        message: "Reserva no encontrada" 
      });
    }

    // Verificar que la reserva pertenece al usuario o que sea admin
    if (booking.userId !== userId && userRole !== 'admin') {
      return res.status(403).json({
        message: "No tienes permisos para ver esta reserva"
      });
    }

    return res.json(booking);

  } catch (error) {
    console.error("Error al obtener reserva:", error);
    return res.status(500).json({
      message: "Error al obtener la reserva",
      error: error.message
    });
  }
};