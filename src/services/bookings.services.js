import { Booking } from "../models/Booking.js";
import { Flight } from "../models/Flight.js";

// Crear una nueva reserva
export const createBooking = async (req, res) => {
  try {
    const { flightId, passengers, totalPrice } = req.body;
    const userId = req.user.id;

    if (!flightId || !passengers || !totalPrice || !Array.isArray(passengers)) {
      return res.status(400).json({ message: "Datos de reserva incompletos" });
    }

    const flight = await Flight.findByPk(flightId);
    if (!flight) {
      return res.status(404).json({ message: "Vuelo no encontrado" });
    }

    const booking = await Booking.create({
      userId: userId,
      flightId,
      passengers,
      passengerCount: passengers.length,
      totalPrice,
      status: 'Activo'
    });

    const bookingWithFlight = await Booking.findByPk(booking.id, {
      include: [{ model: Flight, as: 'flight' }]
    });

    return res.status(201).json({ message: "Reserva creada exitosamente", booking: bookingWithFlight });

  } catch (error) {
    console.error("Error al crear reserva:", error);
    return res.status(500).json({ message: "Error al procesar la reserva", error: error.message });
  }
};

// Obtener todas las reservas de un usuario (el usuario logueado)
export const getUserBookings = async (req, res) => {
  try {
    const userId = req.user.id; 

    const bookings = await Booking.findAll({
      where: { userId },
      include: [{ model: Flight, as: 'flight' }],
      order: [['purchaseDate', 'DESC']]
    });

    const today = new Date();
    const updatedBookings = bookings.map(booking => {
      const flightDate = new Date(booking.flight.date);
      const currentStatus = flightDate < today ? 'Inactivo' : 'Activo';

      if (booking.status !== currentStatus) {
        booking.update({ status: currentStatus });
      }

      return { ...booking.toJSON(), status: currentStatus };
    });

    return res.json(updatedBookings);

  } catch (error) {
    console.error("Error al obtener reservas:", error);
    return res.status(500).json({ message: "Error al obtener las reservas", error: error.message });
  }
};

// Obtener una reserva por ID (solo si pertenece al usuario)
export const getBookingById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id; 

    const booking = await Booking.findByPk(id, { include: [{ model: Flight, as: 'flight' }] });

    if (!booking) {
      return res.status(404).json({ message: "Reserva no encontrada" });
    }

    if (booking.userId !== userId) {
      return res.status(403).json({ message: "No tienes permisos para ver esta reserva" });
    }

    return res.json(booking);
  } catch (error) {
    console.error("Error al obtener la reserva por ID:", error);
    return res.status(500).json({ message: "Error al obtener la reserva", error: error.message });
  }
};
