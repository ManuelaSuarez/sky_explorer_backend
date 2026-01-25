import { Airline } from "../models/Airline.js";
import { User } from "../models/User.js";
import { Flight } from "../models/Flight.js";
import { Booking } from "../models/Booking.js";
import { Favorite } from "../models/Favorite.js";
import { Review } from "../models/Review.js";
import { Op } from "sequelize";
import bcrypt from "bcrypt";

// Obtener todas las aerolíneas
export const getAirlines = async (req, res) => {
  try {
    const airlines = await Airline.findAll({
      attributes: { exclude: ["password"] },
    });
    res.json(airlines);
  } catch (error) {
    console.error("Error al obtener aerolíneas:", error);
    res
      .status(500)
      .json({ message: "Error al obtener aerolíneas", error: error.message });
  }
};

// Crear una nueva aerolínea
export const createAirline = async (req, res) => {
  const { name, code, cuit, email, password } = req.body;

  try {
    const existingAirlineInAirlineTable = await Airline.findOne({
      where: { email },
    });

    if (existingAirlineInAirlineTable) {
      return res
        .status(400)
        .json({ message: "Ya existe una aerolínea con este email." });
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        message: "Este email ya está registrado como usuario en el sistema.",
      });
    }

    const existingUserWithName = await User.findOne({ where: { name } });
    if (existingUserWithName) {
      return res.status(400).json({
        message: "Este nombre de aerolínea ya está en uso como usuario.",
      });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const newAirline = await Airline.create({
      name,
      code,
      cuit,
      email,
      password: hashedPassword,
      role: "airline",
    });

    await User.create({
      name: name,
      email: email,
      password: hashedPassword,
      role: "airline",
    });

    res.status(201).json(newAirline);
  } catch (error) {
    console.error("Error al crear aerolínea:", error);
    res
      .status(500)
      .json({ message: "Error al crear aerolínea", error: error.message });
  }
};

// Actualizar una aerolínea
export const updateAirline = async (req, res) => {
  const { id } = req.params;
  const { name, code, cuit, email } = req.body;

  try {
    const airline = await Airline.findByPk(id);

    if (!airline) {
      return res.status(404).json({ message: "Aerolínea no encontrada." });
    }

    // Guardar el nombre anterior
    const oldName = airline.name;

    // Actualizar datos de la aerolínea
    airline.name = name;
    airline.code = code;
    airline.cuit = cuit;
    airline.email = email;
    await airline.save();

    // Actualizar el usuario asociado
    const userToUpdate = await User.findOne({
      where: { email: airline.email },
    });
    
    if (userToUpdate) {
      userToUpdate.name = name;
      userToUpdate.email = email;
      await userToUpdate.save();

      // Actualizar nombre en TODOS los vuelos si cambió
      if (oldName !== name) {
        const updatedFlights = await Flight.update(
          { airline: name },
          { 
            where: { 
              [Op.or]: [
                { airline: oldName },
                { createdBy: userToUpdate.id }
              ]
            } 
          }
        );

        console.log(` ${updatedFlights[0]} vuelo(s) actualizados de "${oldName}" a "${name}"`);

        // Actualizar nombre en TODAS las reseñas
        const updatedReviews = await Review.update(
          { airline: name },
          { where: { airline: oldName } }
        );

        console.log(`${updatedReviews[0]} reseña(s) actualizadas de "${oldName}" a "${name}"`);
      }
    }

    res.json(airline);
  } catch (error) {
    console.error("Error al actualizar aerolínea:", error);
    res
      .status(500)
      .json({ message: "Error al actualizar aerolínea", error: error.message });
  }
};


// Eliminar una aerolínea
export const deleteAirline = async (req, res) => {
  const { id } = req.params;
  
  try {
    const airline = await Airline.findByPk(id);
    if (!airline) {
      return res.status(404).json({ message: "Aerolínea no encontrada" });
    }

    console.log(`Verificando aerolínea: ${airline.name}`);

    // Buscar usuario asociado
    const userAirline = await User.findOne({
      where: { email: airline.email, role: "airline" }
    });

    if (!userAirline) {
      return res.status(404).json({ 
        message: "Usuario de aerolínea no encontrado" 
      });
    }

    // Buscar TODOS los vuelos
    const flights = await Flight.findAll({ 
      where: { 
        [Op.or]: [
          { airline: airline.name },
          { createdBy: userAirline.id }
        ]
      } 
    });

    console.log(`${flights.length} vuelo(s) encontrado(s)`);

    // Verificar reservas activas en vuelos futuros
    const now = new Date();
    
    for (const flight of flights) {
      const flightDateTime = new Date(`${flight.date}T${flight.departureTime}`);
      const isFuture = flightDateTime > now;

      if (isFuture) {
        const activeBookings = await Booking.count({
          where: { 
            flightId: flight.id, 
            status: "Activo" 
          }
        });

        if (activeBookings > 0) {
          return res.status(400).json({ 
            message: "No se puede eliminar una aerolínea con reservas activas en vuelos futuros" 
          });
        }
      }
    }

    // ========== ELIMINAR TODO ==========
    console.log(`Sin reservas activas, eliminando...`);

    const flightIds = flights.map(f => f.id);

    if (flightIds.length > 0) {
      await Favorite.destroy({ where: { flightId: flightIds } });
      await Booking.destroy({ where: { flightId: flightIds } });
      await Flight.destroy({ where: { id: flightIds } });
      
      console.log(`${flightIds.length} vuelo(s) eliminado(s)`);
    }

    // Eliminar reseñas por nombre de aerolínea
    const deletedReviews = await Review.destroy({ 
      where: { airline: airline.name } 
    });
    
    console.log(`${deletedReviews} reseña(s) eliminada(s)`);

    // Eliminar usuario y aerolínea
    await User.destroy({ where: { id: userAirline.id } });
    await airline.destroy();

    console.log(`Aerolínea ${airline.name} eliminada`);
    
    return res.status(200).json({ 
      message: "Aerolínea eliminada correctamente" 
    });

  } catch (error) {
    console.error("Error al eliminar aerolínea:", error);
    return res.status(500).json({ 
      message: "Error al eliminar la aerolínea", 
      error: error.message 
    });
  }
};