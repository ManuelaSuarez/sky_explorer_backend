import bcrypt from "bcrypt";
import { User } from "../models/User.js";
import { Booking } from "../models/Booking.js";
import { Review } from "../models/Review.js";
import { Favorite } from "../models/Favorite.js";
import { Flight } from "../models/Flight.js";
import { Airline } from "../models/Airline.js";
import { Op } from "sequelize";
import fs from "fs/promises";
import path from "path";

// FUNCIONES ADMIN

// Listar todos los usuarios
export const getUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ["id", "name", "email", "role", "createdAt"],
      order: [["id", "DESC"]],
    });
    res.json(users);
  } catch (error) {
    console.error("Error al obtener usuarios:", error);
    res.status(500).json({ message: "Error al obtener usuarios" });
  }
};

// Obtener un usuario específico
export const getUserById = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: ["id", "name", "email", "role", "createdAt"],
    });

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    res.json(user);
  } catch (error) {
    console.error("Error al obtener usuario:", error);
    res.status(500).json({ message: "Error al obtener usuario" });
  }
};

// Crear usuario de aerolínea
export const createUser = async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: "Nombre, email y contraseña son requeridos" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Las contraseñas no coinciden" });
    }

    const userExists = await User.findOne({ where: { email } });
    if (userExists) {
      return res.status(400).json({ message: "Este email ya está registrado" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "airline",
    });

    res.status(201).json({
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
    });
  } catch (error) {
    console.error("Error al crear usuario:", error);
    res.status(500).json({ message: "Error al crear usuario" });
  }
};

// Actualizar usuario de aerolínea
export const updateUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    if (email && email !== user.email) {
      const emailExists = await User.findOne({
        where: { email, id: { [Op.ne]: req.params.id } },
      });
      if (emailExists) {
        return res.status(400).json({ message: "Este email ya está en uso" });
      }
    }

    if (name) user.name = name;
    if (email) user.email = email;
    if (password) {
      user.password = await bcrypt.hash(password, 10);
    }

    await user.save();

    res.json({
      message: "Usuario actualizado",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Error al actualizar usuario:", error);
    res.status(500).json({ message: "Error al actualizar usuario" });
  }
};

// Eliminar usuario de aerolínea (ADMIN)
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    if (req.user.id === parseInt(req.params.id)) {
      return res
        .status(403)
        .json({ message: "No puedes eliminar tu propia cuenta" });
    }

    // VALIDACIÓN PARA AEROLÍNEAS
    if (user.role === "airline") {
      console.log(`🔍 Admin intentando eliminar aerolínea: ${user.name}`);

      // Buscar vuelos ACTIVOS de esta aerolínea
      const activeFlights = await Flight.findAll({
        where: { 
          [Op.or]: [
            { airline: user.name },
            { createdBy: req.params.id }
          ],
          status: "Activo" // SOLO VUELOS ACTIVOS
        },
        attributes: ["id"],
        raw: true
      });

      const activeFlightIds = activeFlights.map(f => f.id);
      console.log(`Vuelos ACTIVOS de ${user.name}:`, activeFlightIds);

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
            { airline: user.name },
            { createdBy: req.params.id }
          ]
        },
        attributes: ["id"],
        raw: true
      });

      const allFlightIds = allFlights.map(f => f.id);
      console.log(` Eliminando ${allFlightIds.length} vuelo(s) totales de ${user.name}...`);

      if (allFlightIds.length > 0) {
        await Favorite.destroy({ where: { flightId: allFlightIds } });
        await Review.destroy({ where: { flightId: allFlightIds } });
        await Booking.destroy({ where: { flightId: allFlightIds } });
        await Flight.destroy({ where: { id: allFlightIds } });
      }
    } else {
      // Si es usuario normal, verificar sus reservas ACTIVAS
      const activeUserBookings = await Booking.count({
        where: { userId: req.params.id },
        include: [{
          model: Flight,
          as: "flight",
          where: { status: "Activo" },
          required: true
        }]
      });
      
      if (activeUserBookings > 0) {
        return res.status(400).json({
          message: `No se puede eliminar: el usuario tiene ${activeUserBookings} reserva(s) activa(s) en vuelos futuros.`,
        });
      }
    }

    // Eliminar relaciones del usuario
    await Review.destroy({ where: { userId: req.params.id } });
    await Favorite.destroy({ where: { userId: req.params.id } });
    await Booking.destroy({ where: { userId: req.params.id } });

    await user.destroy();
    console.log(`Usuario ${user.name} eliminado por admin`);
    res.json({ message: "Usuario eliminado" });
  } catch (error) {
    console.error("Error al eliminar usuario:", error);
    res.status(500).json({ message: "Error al eliminar usuario" });
  }
};

// FUNCIONES USER REGULAR

// Ver mi perfil
export const getMyProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ["id", "name", "email", "role", "profilePicture", "createdAt"],
    });

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    res.json(user);
  } catch (error) {
    console.error("Error al obtener perfil:", error);
    res.status(500).json({ message: "Error al obtener perfil" });
  }
};

// Editar mi perfil
export const updateUserProfile = async (req, res) => {
  try {
    const { name, email, currentPassword, newPassword } = req.body;
    const user = await User.findByPk(req.user.id);
    const file = req.file;

    if (!user) {
      if (file) {
        await fs.unlink(file.path);
      }
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    // Guardar nombre anterior si es aerolínea
    const oldName = user.name;

    if (file) {
      if (user.profilePicture) {
        const oldImagePath = path.join("uploads", "profile-pictures", user.profilePicture);
        try {
          await fs.access(oldImagePath);
          await fs.unlink(oldImagePath);
        } catch (error) {
          console.log("No se pudo eliminar el archivo anterior:", error.message);
        }
      }
      user.profilePicture = file.filename;
    } else if (req.body.profilePicture === "delete" && user.profilePicture) {
      const imagePath = path.join("uploads", "profile-pictures", user.profilePicture);
      try {
        await fs.access(imagePath);
        await fs.unlink(imagePath);
      } catch (error) {
        console.log("No se pudo eliminar el archivo:", error.message);
      }
      user.profilePicture = null;
    }

    if (newPassword) {
      if (!currentPassword) {
        return res
          .status(400)
          .json({ message: "Ingresa tu contraseña actual" });
      }

      const isValidPassword = await bcrypt.compare(
        currentPassword,
        user.password
      );
      if (!isValidPassword) {
        return res
          .status(400)
          .json({ message: "Contraseña actual incorrecta" });
      }

      user.password = await bcrypt.hash(newPassword, 10);
    }

    if (name) user.name = name;
    if (email) user.email = email;

    await user.save();

    // Si es aerolínea y cambió el nombre, actualizar vuelos y reseñas
    if (user.role === "airline" && name && oldName !== name) {
      // Actualizar vuelos
      const updatedFlights = await Flight.update(
        { airline: name },
        { 
          where: { 
            [Op.or]: [
              { airline: oldName },
              { createdBy: user.id }
            ]
          } 
        }
      );

      console.log(`${updatedFlights[0]} vuelo(s) actualizados de "${oldName}" a "${name}"`);

      // Actualizar reseñas
      const updatedReviews = await Review.update(
        { airline: name },
        { where: { airline: oldName } }
      );

      console.log(`✅ ${updatedReviews[0]} reseña(s) actualizadas de "${oldName}" a "${name}"`);

      // También actualizar en la tabla Airline si existe
      const airlineRecord = await Airline.findOne({
        where: { email: user.email }
      });

      if (airlineRecord) {
        airlineRecord.name = name;
        await airlineRecord.save();
      }
    }

    res.json({
      message: "Perfil actualizado",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture,
      },
    });
  } catch (error) {
    console.error("Error al actualizar perfil:", error);
    res.status(500).json({ message: "Error al actualizar perfil" });
  }
};

// Eliminar mi cuenta (con validaciones profesionales)
export const deleteUserProfileWithBookings = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    // VALIDACIÓN PARA AEROLÍNEAS
    if (user.role === "airline") {
      console.log(`🔍 Verificando aerolínea: ${user.name}`);

      // Buscar vuelos ACTIVOS
      const activeFlights = await Flight.findAll({
        where: { 
          [Op.or]: [
            { airline: user.name },
            { createdBy: req.user.id }
          ],
          status: "Activo" //  SOLO ACTIVOS
        },
        attributes: ["id"],
        raw: true
      });

      const activeFlightIds = activeFlights.map(f => f.id);
      console.log(` Vuelos ACTIVOS:`, activeFlightIds);

      if (activeFlightIds.length > 0) {
        const activeBookings = await Booking.count({
          where: { flightId: activeFlightIds }
        });

        if (activeBookings > 0) {
          return res.status(400).json({ 
            message: `No se puede eliminar la cuenta. Tiene ${activeBookings} reserva(s) activa(s) en vuelos futuros.` 
          });
        }

        const activeFavorites = await Favorite.count({
          where: { flightId: activeFlightIds }
        });

        if (activeFavorites > 0) {
          return res.status(400).json({ 
            message: `No se puede eliminar la cuenta. Tiene ${activeFavorites} vuelo(s) activo(s) marcado(s) como favorito(s).` 
          });
        }

        const activeReviews = await Review.count({
          where: { flightId: activeFlightIds }
        });

        if (activeReviews > 0) {
          return res.status(400).json({ 
            message: `No se puede eliminar la cuenta. Tiene ${activeReviews} reseña(s) en vuelos activos.` 
          });
        }
      }

      // Eliminar TODOS los vuelos
      const allFlights = await Flight.findAll({
        where: { 
          [Op.or]: [
            { airline: user.name },
            { createdBy: req.user.id }
          ]
        },
        attributes: ["id"],
        raw: true
      });

      const allFlightIds = allFlights.map(f => f.id);

      if (allFlightIds.length > 0) {
        await Favorite.destroy({ where: { flightId: allFlightIds } });
        await Review.destroy({ where: { flightId: allFlightIds } });
        await Booking.destroy({ where: { flightId: allFlightIds } });
        await Flight.destroy({ where: { id: allFlightIds } });
      }
    } else {
      //  VALIDACIÓN PARA USUARIOS NORMALES
      // Verificar si tiene reservas en vuelos ACTIVOS
      const activeUserBookings = await Booking.count({
        where: { userId: req.user.id },
        include: [{
          model: Flight,
          as: "flight",
          where: { status: "Activo" },
          required: true
        }]
      });

      if (activeUserBookings > 0) {
        return res.status(400).json({
          message: `No puedes eliminar tu cuenta. Tienes ${activeUserBookings} reserva(s) activa(s) en vuelos futuros. Por favor, espera a que los vuelos se completen o contacta con soporte.`
        });
      }
    }

    // Eliminar foto de perfil
    if (user.profilePicture) {
      const imagePath = path.join("uploads", "profile-pictures", user.profilePicture);
      try {
        await fs.access(imagePath);
        await fs.unlink(imagePath);
      } catch (error) {
        console.log("No se pudo eliminar la foto de perfil:", error.message);
      }
    }

    // Eliminar relaciones del usuario
    await Review.destroy({ where: { userId: req.user.id } });
    await Favorite.destroy({ where: { userId: req.user.id } });
    await Booking.destroy({ where: { userId: req.user.id } });

    // Eliminar usuario
    await user.destroy();

    console.log(`Usuario ${user.name} eliminado correctamente`);
    res.json({ message: "Cuenta eliminada correctamente" });
  } catch (error) {
    console.error("Error al eliminar cuenta:", error);
    res.status(500).json({ message: "Error al eliminar cuenta" });
  }
};