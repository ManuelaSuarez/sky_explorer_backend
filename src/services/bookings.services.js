import { Booking } from "../models/Booking.js";
import { Flight } from "../models/Flight.js";
import { User } from "../models/User.js";
import { Op } from "sequelize";

// Crear una nueva reserva
export const createBooking = async (req, res) => {
  try {
    const { flightId, passengers, totalPrice } = req.body;
    const userId = req.user.id; 

    // Validar que los datos estén completos
    if (!flightId || !passengers || !totalPrice || !Array.isArray(passengers)) {
      return res.status(400).json({ message: "Datos de reserva incompletos" });
    }

    // Verificar si el vuelo existe
    const flight = await Flight.findByPk(flightId);
    if (!flight) {
      return res.status(404).json({ message: "Vuelo no encontrado" });
    }

    // Crear la reserva en la base de datos
    const booking = await Booking.create({
      userId: userId,
      flightId,
      passengers,
      passengerCount: passengers.length,
      totalPrice,
      status: 'Activo' 
    });

    // Obtener la reserva recién creada con los detalles del vuelo para devolverla
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

    // Actualiza el estado de las reservas a 'Inactivo' si la fecha del vuelo ya pasó
    const today = new Date();
    const updatedBookings = bookings.map(booking => {
      const flightDate = new Date(booking.flight.date);
      const currentStatus = flightDate < today ? 'Inactivo' : 'Activo';
      
      // Si el estado en la BD es diferente, lo actualiza
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


// Obtener reservas de un usuario específico (para admin)
export const getUserBookingsByParam = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });
    const bookings = await Booking.findAll({ where: { userId }, include: [{ model: Flight, as: 'flight' }] });
    return res.json(bookings);
  } catch (error) {
    return res.status(500).json({ message: "Error al obtener las reservas", error: error.message });
  }
};

// Obtener todas las reservas (para admin)
export const getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.findAll({
      include: [{ model: Flight, as: 'flight' }, { model: User, as: 'user', attributes: ['id', 'name', 'email'] }]
    });
    // Lógica para actualizar estados como en getUserBookings
    const today = new Date();
    const updatedBookings = bookings.map(booking => {
      const flightDate = new Date(booking.flight.date);
      const currentStatus = flightDate < today ? 'Inactivo' : 'Activo';
      if (booking.status !== currentStatus) { booking.update({ status: currentStatus }); }
      return { ...booking.toJSON(), status: currentStatus };
    });
    return res.json(updatedBookings);
  } catch (error) {
    return res.status(500).json({ message: "Error al obtener las reservas", error: error.message });
  }
};

// Obtener una reserva por ID (solo si pertenece al usuario o es admin)
export const getBookingById = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findByPk(id, { include: [{ model: Flight, as: 'flight' }, { model: User, as: 'user', attributes: ['id', 'name', 'email'] }] });
    if (!booking) return res.status(404).json({ message: "Reserva no encontrada" });
    if (booking.userId !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ message: "No tienes permisos" });
    return res.json(booking);
  } catch (error) {
    return res.status(500).json({ message: "Error al obtener la reserva", error: error.message });
  }
};

// Cancelar una reserva (solo el propietario o admin)
export const cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findByPk(id, { include: [{ model: Flight, as: 'flight' }] });
    if (!booking) return res.status(404).json({ message: "Reserva no encontrada" });
    if (booking.userId !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ message: "No tienes permisos" });
    const flightDate = new Date(booking.flight.date);
    const today = new Date();
    if (flightDate < today) return res.status(400).json({ message: "No se puede cancelar una reserva de un vuelo que ya pasó" });
    await booking.destroy();
    return res.json({ message: "Reserva cancelada exitosamente" });
  } catch (error) {
    return res.status(500).json({ message: "Error al cancelar la reserva", error: error.message });
  }
};

// Actualizar una reserva (solo admin o casos específicos)
export const updateBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { passengers, totalPrice, status } = req.body;
    const booking = await Booking.findByPk(id);
    if (!booking) return res.status(404).json({ message: "Reserva no encontrada" });
    if (booking.userId !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ message: "No tienes permisos" });
    if (passengers && Array.isArray(passengers)) { booking.passengers = passengers; booking.passengerCount = passengers.length; }
    if (totalPrice) booking.totalPrice = totalPrice;
    if (status && req.user.role === 'admin' && ['Activo', 'Inactivo', 'Cancelado'].includes(status)) booking.status = status;
    await booking.save();
    const updatedBooking = await Booking.findByPk(booking.id, { include: [{ model: Flight, as: 'flight' }, { model: User, as: 'user', attributes: ['id', 'name', 'email'] }] });
    return res.json({ message: "Reserva actualizada exitosamente", booking: updatedBooking });
  } catch (error) {
    return res.status(500).json({ message: "Error al actualizar la reserva", error: error.message });
  }
};

// Obtener estadísticas de reservas (para admin)
export const getBookingStats = async (req, res) => {
  try {
    const totalBookings = await Booking.count();
    const activeBookings = await Booking.count({ where: { status: 'Activo' } });
    const inactiveBookings = await Booking.count({ where: { status: 'Inactivo' } });
    const canceledBookings = await Booking.count({ where: { status: 'Cancelado' } });
    const currentYear = new Date().getFullYear();
    const bookingsByMonth = await Booking.findAll({
      attributes: [
        [Booking.sequelize.fn('MONTH', Booking.sequelize.col('purchaseDate')), 'month'],
        [Booking.sequelize.fn('COUNT', '*'), 'count']
      ],
      where: {
        purchaseDate: { [Op.gte]: new Date(`${currentYear}-01-01`), [Op.lt]: new Date(`${currentYear + 1}-01-01`) }
      },
      group: [Booking.sequelize.fn('MONTH', Booking.sequelize.col('purchaseDate'))],
      order: [[Booking.sequelize.fn('MONTH', Booking.sequelize.col('purchaseDate')), 'ASC']]
    });
    return res.json({ totalBookings, activeBookings, inactiveBookings, canceledBookings, bookingsByMonth });
  } catch (error) {
    return res.status(500).json({ message: "Error al obtener las estadísticas", error: error.message });
  }
};