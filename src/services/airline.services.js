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
    if (!airline) return res.status(404).json({ message: "Aerolínea no encontrada" });

    // Buscamos todos los vuelos de esta aerolínea
    const flights = await Flight.findAll({ where: { airline: airline.name } });

   for (const flight of flights) {
  const activePeople = await Booking.count({
    where: { 
      flightId: flight.id, 
      status: "Activo"
    }
  });

  if (activePeople > 0) {
    return res.status(400).json({ 
      message: `La aerolínea no se puede borrar: el vuelo con destino a ${flight.destination} tiene pasajeros activos.` 
    });
  }

  // Limpiamos SOLO lo que depende del vuelo
  await Favorite.destroy({ where: { flightId: flight.id } });
  await Booking.destroy({ where: { flightId: flight.id } });
  await flight.destroy();
}

    await User.destroy({ where: { email: airline.email } });
    await airline.destroy();

    return res.status(200).json({ message: "Aerolínea eliminada correctamente" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error al eliminar aerolínea" });
  }
};