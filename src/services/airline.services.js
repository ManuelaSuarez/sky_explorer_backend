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
    const airlineToDelete = await Airline.findByPk(id);

    if (!airlineToDelete) {
      return res.status(404).json({ message: "Aerolínea no encontrada." });
    }

    console.log(`Admin intentando eliminar aerolínea: ${airlineToDelete.name}`);

    //  Buscar el usuario asociado
    const userAirline = await User.findOne({
      where: { email: airlineToDelete.email, role: "airline" }
    });

    if (!userAirline) {
      return res.status(404).json({ 
        message: "No se encontró el usuario asociado a esta aerolínea." 
      });
    }

    //  Buscar vuelos ACTIVOS de esta aerolínea
    const activeFlights = await Flight.findAll({
      where: { 
        [Op.or]: [
          { airline: airlineToDelete.name },
          { createdBy: userAirline.id }
        ],
        status: "Activo"
      },
      attributes: ["id"],
      raw: true
    });

    const activeFlightIds = activeFlights.map(f => f.id);
    console.log(`Vuelos ACTIVOS de ${airlineToDelete.name}:`, activeFlightIds);

    if (activeFlightIds.length > 0) {
      // Verificar reservas en vuelos ACTIVOS
      const activeBookings = await Booking.count({
        where: { flightId: activeFlightIds }
      });

      if (activeBookings > 0) {
        return res.status(400).json({
          message: `No se puede eliminar: la aerolínea tiene ${activeBookings} reserva(s) activa(s) en vuelos futuros.`,
        });
      }

      // Verificar favoritos en vuelos ACTIVOS
      const activeFavorites = await Favorite.count({
        where: { flightId: activeFlightIds }
      });

      if (activeFavorites > 0) {
        return res.status(400).json({
          message: `No se puede eliminar: tiene ${activeFavorites} vuelo(s) activo(s) marcado(s) como favorito(s).`,
        });
      }

      // Verificar reseñas en vuelos ACTIVOS
      const activeReviews = await Review.count({
        where: { flightId: activeFlightIds }
      });

      if (activeReviews > 0) {
        return res.status(400).json({
          message: `No se puede eliminar: tiene ${activeReviews} reseña(s) en vuelos activos.`,
        });
      }
    }

    // Buscar TODOS los vuelos (activos e inactivos) para eliminar
    const allFlights = await Flight.findAll({
      where: { 
        [Op.or]: [
          { airline: airlineToDelete.name },
          { createdBy: userAirline.id }
        ]
      },
      attributes: ["id"],
      raw: true
    });

    const allFlightIds = allFlights.map(f => f.id);
    console.log(`Eliminando ${allFlightIds.length} vuelo(s) totales de ${airlineToDelete.name}...`);

    if (allFlightIds.length > 0) {
      // Eliminar todas las relaciones de los vuelos
      await Favorite.destroy({ where: { flightId: allFlightIds } });
      await Review.destroy({ where: { flightId: allFlightIds } });
      await Booking.destroy({ where: { flightId: allFlightIds } });
      await Flight.destroy({ where: { id: allFlightIds } });
    }

    // Eliminar relaciones del usuario
    await Review.destroy({ where: { userId: userAirline.id } });
    await Favorite.destroy({ where: { userId: userAirline.id } });
    await Booking.destroy({ where: { userId: userAirline.id } });

    // Eliminar el usuario asociado
    await User.destroy({
      where: { id: userAirline.id },
    });

    // Eliminar de la tabla Airline
    const deletedRows = await Airline.destroy({
      where: { id },
    });

    if (deletedRows === 0) {
      return res.status(404).json({
        message: "Aerolínea no encontrada (después de intentar eliminar).",
      });
    }

    console.log(`Aerolínea ${airlineToDelete.name} eliminada correctamente`);
    res.status(204).send();
  } catch (error) {
    console.error("Error al eliminar aerolínea:", error);
    res
      .status(500)
      .json({ message: "Error al eliminar aerolínea", error: error.message });
  }
};