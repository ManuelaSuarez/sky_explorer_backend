import { Flight } from "../models/Flight.js";
import { Booking } from "../models/Booking.js";
import { Favorite } from "../models/Favorite.js";      
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

/**Valida que la fecha y hora del vuelo sean futuras*/
const validateFlightDateTime = (date, departureTime) => {
  const now = new Date();
  
  // Obtenemos año, mes y día actual LOCAL
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentDate = now.getDate();

  // Parseamos la fecha recibida (YYYY-MM-DD) manualmente para evitar desfase UTC
  const [year, month, day] = date.split('-').map(Number);
  
  // Creamos objetos de fecha comparables (00:00:00 local)
  const todayStart = new Date(currentYear, currentMonth, currentDate).getTime();
  const flightDateStart = new Date(year, month - 1, day).getTime(); // month-1 porque enero es 0

  // 1. Validar si la fecha es anterior a hoy
  if (flightDateStart < todayStart) {
    return {
      valid: false,
      message: "La fecha del vuelo no puede ser anterior a hoy"
    };
  }

  // 2. Si el vuelo es HOY, validar que la hora no haya pasado
  if (flightDateStart === todayStart) {
    const [hours, minutes] = departureTime.split(':').map(Number);
    const flightDateTime = new Date(currentYear, currentMonth, currentDate, hours, minutes);
    
    // Margen de seguridad: 30 minutos desde "ahora"
    const minValidTime = new Date(now.getTime() + 30 * 60000);
    
    if (flightDateTime < minValidTime) {
      return {
        valid: false,
        message: "La hora de salida debe ser al menos 30 minutos posterior a la hora actual"
      };
    }
  }
  
  return { valid: true };
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

// VUELOS DESTACADOS
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

    console.log("Creando vuelo con datos:", { airline, origin, destination, date, departureTime, isFeatured });

    // ========== VALIDACIONES ==========

    // 1. Campos obligatorios
    if (!airline || !origin || !destination || !date || !departureTime || !arrivalTime) {
      return res.status(400).json({ 
        message: "Todos los campos son obligatorios (aerolínea, origen, destino, fecha, hora salida, hora llegada)" 
      });
    }

    // 2. Validar origen y destino diferentes
    if (origin === destination) {
      return res.status(400).json({ 
        message: "El origen y el destino no pueden ser iguales" 
      });
    }

    // 3. Validar capacidad
    const capacityNum = Number(capacity);
    if (!capacity || isNaN(capacityNum) || capacityNum <= 0) {
      return res.status(400).json({ 
        message: "La capacidad del vuelo debe ser un número mayor a 0" 
      });
    }

    // 4. Validar precio
    const basePriceNum = Number(basePrice);
    if (!basePrice || isNaN(basePriceNum) || basePriceNum <= 0) {
      return res.status(400).json({ 
        message: "El precio base debe ser un número mayor a 0" 
      });
    }

    // 5. Validar formato de horas
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(departureTime)) {
      return res.status(400).json({ 
        message: "El formato de la hora de salida no es válido (debe ser HH:MM)" 
      });
    }
    if (!timeRegex.test(arrivalTime)) {
      return res.status(400).json({ 
        message: "El formato de la hora de llegada no es válido (debe ser HH:MM)" 
      });
    }

    // 6. Validar fecha y hora futuras
    const dateTimeValidation = validateFlightDateTime(date, departureTime);
    if (!dateTimeValidation.valid) {
      return res.status(400).json({ message: dateTimeValidation.message });
    }

    // 7. Validar duración del vuelo (mínimo 30 minutos)
    const [depHour, depMin] = departureTime.split(':').map(Number);
    const [arrHour, arrMin] = arrivalTime.split(':').map(Number);
    let depMinutes = depHour * 60 + depMin;
    let arrMinutes = arrHour * 60 + arrMin;
    
    // Si llegada es menor, asumimos día siguiente
    if (arrMinutes <= depMinutes) {
      arrMinutes += 24 * 60;
    }
    
    const durationMinutes = arrMinutes - depMinutes;
    if (durationMinutes < 30) {
      return res.status(400).json({ 
        message: "La duración del vuelo debe ser de al menos 30 minutos" 
      });
    }

    // 8. Validar imagen si es destacado
    if ((isFeatured === "true" || isFeatured === true) && !req.file) {
      return res.status(400).json({ 
        message: "La imagen es obligatoria para vuelos destacados" 
      });
    }

    // ========== CREAR VUELO ==========

    const imageUrl = req.file ? `/uploads/flights/${req.file.filename}` : null;

    const flight = await Flight.create({
      airline, 
      origin, 
      destination, 
      date,
      departureTime, 
      arrivalTime, 
      capacity: capacityNum, 
      basePrice: basePriceNum,
      isFeatured: isFeatured === "true" || isFeatured === true,
      imageUrl,
      createdBy: req.user.id,
    });

    const flightData = flight.toJSON();
    const duration = calculateDuration(flightData.departureTime, flightData.arrivalTime);

    console.log(" Vuelo creado exitosamente:", flight.id);

    res.status(201).json({
      ...flightData,
      duration,
      returnDuration: duration,
    });
  } catch (error) {
    console.error("Error al crear vuelo:", error.message);
    console.error("Stack:", error.stack);
    return res.status(500).json({
      message: "Error interno al crear el vuelo",
      error: error.message,
    });
  }
};

// Actualizar vuelo
export const updateFlight = async (req, res) => {
  try {
    const { id } = req.params;
    const flight = await Flight.findByPk(id);
    
    if (!flight) {
      return res.status(404).json({ message: "Vuelo no encontrado" });
    }

    // NO EDITAR VUELOS PASADOS ---
    const now = new Date();
    const flightDateTime = new Date(`${flight.date}T${flight.departureTime}`);
    const isFuture = flightDateTime > now;

    if (!isFuture) {
      return res.status(400).json({ 
        message: "No se puede modificar un vuelo pasado" 
      });
    }

    // NO EDITAR VUELOS CON RESERVAS ACTIVAS ---
    const activeBookings = await Booking.count({
      where: { 
        flightId: id,
        status: "Activo"
      }
    });

    if (activeBookings > 0) {
      return res.status(400).json({
        message: "No se puede modificar un vuelo con reservas activas"
      });
    }

    // ========== VALIDACIONES DEL FORMULARIO ==========
    const { 
      airline, origin, destination, date, 
      departureTime, arrivalTime, capacity, basePrice, isFeatured 
    } = req.body;

    if (!airline || !origin || !destination || !date || !departureTime || !arrivalTime) {
      return res.status(400).json({ 
        message: "Todos los campos son obligatorios" 
      });
    }

    if (origin === destination) {
      return res.status(400).json({ 
        message: "El origen y el destino deben ser diferentes" 
      });
    }

    const capacityNum = Number(capacity);
    if (!capacity || isNaN(capacityNum) || capacityNum <= 0) {
      return res.status(400).json({ 
        message: "La capacidad debe ser mayor a 0" 
      });
    }

    const basePriceNum = Number(basePrice);
    if (!basePrice || isNaN(basePriceNum) || basePriceNum <= 0) {
      return res.status(400).json({ 
        message: "El precio debe ser mayor a 0" 
      });
    }

    // Validar nueva fecha
    const dateTimeValidation = validateFlightDateTime(date, departureTime);
    if (!dateTimeValidation.valid) {
      return res.status(400).json({ message: dateTimeValidation.message });
    }

    // Validar imagen si es destacado
    if ((isFeatured === "true" || isFeatured === true) && !req.file && !flight.imageUrl) {
      return res.status(400).json({ 
        message: "Los vuelos destacados requieren una imagen" 
      });
    }

    // ========== ACTUALIZAR ==========
    const updateData = {
      airline, 
      origin, 
      destination, 
      date, 
      departureTime, 
      arrivalTime,
      capacity: capacityNum,
      basePrice: basePriceNum,
      isFeatured: isFeatured === "true" || isFeatured === true,
    };

    if (req.file) {
      updateData.imageUrl = `/uploads/flights/${req.file.filename}`;
    }

    await flight.update(updateData);
    
    console.log(`Vuelo ${id} actualizado`);
    res.json(flight);

  } catch (error) {
    console.error("Error al actualizar vuelo:", error);
    res.status(500).json({ 
      message: "Error al actualizar el vuelo", 
      error: error.message 
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

    // Verificar permisos
    if (req.user?.role === "airline" && req.user.name !== flight.airline) {
      return res.status(403).json({ 
        message: "No tienes permiso para eliminar este vuelo" 
      });
    }

    // NO BORRAR SI TIENE RESERVAS ACTIVAS ---
    const activeBookings = await Booking.count({
      where: { 
        flightId: id, 
        status: "Activo" 
      }
    });

    if (activeBookings > 0) {
      return res.status(400).json({
        message: "No se puede eliminar un vuelo con reservas activas"
      });
    }

    // ========== ELIMINAR VUELO Y DEPENDENCIAS ==========
    console.log(`Eliminando vuelo ${id}...`);

    
    // Eliminar solo favoritos y bookings
    await Favorite.destroy({ where: { flightId: id } });
    await Booking.destroy({ where: { flightId: id } });
    
    // Eliminar vuelo
    await flight.destroy();

    console.log(`Vuelo ${id} eliminado`);
    res.json({ message: "Vuelo eliminado correctamente" });

  } catch (error) {
    console.error("Error al eliminar vuelo:", error);
    console.error("Stack completo:", error.stack); // ← Ver el error completo
    res.status(500).json({ 
      message: "Error al eliminar el vuelo", 
      error: error.message 
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

    // Si pasa a INACTIVO, inactivar también las reservas
    if (flight.status === "Activo") {
      await flight.update({ status: "Inactivo" });

      await Booking.update(
        { status: "Inactivo" },
        { where: { flightId: flight.id } }
      );

      console.log(`Vuelo ${id} y sus reservas fueron inactivados`);
    } else {
      // Si vuelve a Activo, solo se reactiva el vuelo (NO las reservas)
      await flight.update({ status: "Activo" });
      console.log(`Vuelo ${id} reactivado`);
    }

    const flightData = flight.toJSON();
    const duration = calculateDuration(
      flightData.departureTime,
      flightData.arrivalTime
    );

    return res.json({
      message: `Estado del vuelo cambiado a ${flight.status}`,
      flight: {
        ...flightData,
        duration,
        returnDuration: duration,
      },
    });

  } catch (error) {
    console.error("Error al cambiar estado del vuelo:", error.message);
    return res.status(500).json({
      message: "Error al cambiar el estado del vuelo",
      error: error.message,
    });
  }
};
