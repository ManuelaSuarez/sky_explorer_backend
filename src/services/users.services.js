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
    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });

    // 1. SI ES AEROLÍNEA: Evaluación vuelo por vuelo
    if (user.role === "airline") {
      const flights = await Flight.findAll({
        where: { [Op.or]: [{ airline: user.name }, { createdBy: user.id }] }
      });

      for (const flight of flights) {
        // Contamos reservas que NO estén canceladas ni inactivas
        const activeBookings = await Booking.count({
          where: { 
            flightId: flight.id, 
            status: { [Op.notIn]: ["Cancelado", "Inactivo"] } 
          }
        });

        // Si un solo vuelo tiene gente activa, frenamos todo
        if (activeBookings > 0) {
          return res.status(400).json({ 
            message: `No se puede eliminar: el vuelo ${flight.origin}-${flight.destination} tiene ${activeBookings} reservas activas.` 
          });
        }

        // Si el vuelo no tiene reservas activas, borramos sus dependencias
        await Favorite.destroy({ where: { flightId: flight.id } });
        await Review.destroy({ where: { flightId: flight.id } });
        await Booking.destroy({ where: { flightId: flight.id } }); // Borra las inactivas
        await flight.destroy();
      }
      
      await Airline.destroy({ where: { email: user.email } });
    }

    // 2. SI ES USUARIO (PASAJERO)
    if (user.role === "user") {
      const activeBookings = await Booking.count({
        where: { userId: user.id, status: { [Op.notIn]: ["Cancelado", "Inactivo"] } }
      });

      if (activeBookings > 0) {
        return res.status(400).json({ message: "Tienes reservas activas pendientes." });
      }
    }

    // Limpieza final de relaciones del usuario
    await Review.destroy({ where: { userId: user.id } });
    await Favorite.destroy({ where: { userId: user.id } });
    await Booking.destroy({ where: { userId: user.id } }); 
    await user.destroy();

    res.json({ message: "Eliminado con éxito" });
  } catch (error) {
    res.status(500).json({ message: "Error al procesar el borrado" });
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

      console.log(`${updatedReviews[0]} reseña(s) actualizadas de "${oldName}" a "${name}"`);

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

// Eliminar mi cuenta 
// Eliminar mi cuenta 
export const deleteUserProfileWithBookings = async (req, res) => {
  // Iniciamos una transacción para asegurar que la limpieza sea atómica
  const t = await User.sequelize.transaction();

  try {
    const user = await User.findByPk(req.user.id, { transaction: t });
    if (!user) {
      await t.rollback();
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const now = new Date();

    /* =====================================================
       1. USUARIO NORMAL (PASAJERO)
    ===================================================== */
    if (user.role === "user") {
      const allBookings = await Booking.findAll({
        where: { userId: user.id },
        include: [{ model: Flight, as: "flight", required: true }],
        transaction: t
      });

      const futureBookings = allBookings.filter(booking => {
        const flightDateTime = new Date(`${booking.flight.date}T${booking.flight.departureTime}`);
        return flightDateTime > now;
      });

      if (futureBookings.length > 0) {
        await t.rollback();
        return res.status(400).json({
          message: `No puedes eliminar tu cuenta: tienes ${futureBookings.length} reserva(s) en vuelos futuros.`
        });
      }
    }

    /* =====================================================
       2. AEROLÍNEA (DUEÑA DE VUELOS)
    ===================================================== */
    if (user.role === "airline") {
      const flights = await Flight.findAll({
        where: {
          [Op.or]: [{ airline: user.name }, { createdBy: user.id }]
        },
        transaction: t
      });

      for (const flight of flights) {
        const flightDateTime = new Date(`${flight.date}T${flight.departureTime}`);
        
        // Bloqueo si hay pasajeros en vuelos que aún no ocurren
        if (flightDateTime > now) {
          const bookingsCount = await Booking.count({ 
            where: { flightId: flight.id }, 
            transaction: t 
          });

          if (bookingsCount > 0) {
            await t.rollback();
            return res.status(400).json({
              message: `No se puede eliminar: el vuelo a ${flight.destination} tiene reservas activas.`
            });
          }
        }

        // LIMPIEZA DEL VUELO (Sin tocar reviews aquí, ya que no tienen flightId)
        await Favorite.destroy({ where: { flightId: flight.id }, transaction: t });
        await Booking.destroy({ where: { flightId: flight.id }, transaction: t });
        await flight.destroy({ transaction: t });
      }

      // Borrar las reseñas que otros usuarios le hicieron A ESTA aerolínea
      await Review.destroy({ where: { airline: user.name }, transaction: t });
      
      // Borrar registro de la tabla Airline
      await Airline.destroy({ where: { email: user.email }, transaction: t });
    }

    /* =====================================================
       3. LIMPIEZA FINAL DE LA CUENTA (Común para ambos)
    ===================================================== */
    // Borrar lo que EL USUARIO generó (sus reviews dadas, sus favoritos, sus bookings)
    await Review.destroy({ where: { userId: user.id }, transaction: t });
    await Favorite.destroy({ where: { userId: user.id }, transaction: t });
    await Booking.destroy({ where: { userId: user.id }, transaction: t });

    // Borrar foto de perfil física
    if (user.profilePicture) {
      const imagePath = path.join("uploads", "profile-pictures", user.profilePicture);
      try {
        await fs.access(imagePath);
        await fs.unlink(imagePath);
      } catch (err) {
        console.log("Archivo no encontrado, continuando...");
      }
    }

    // Finalmente borrar al usuario
    await user.destroy({ transaction: t });

    // Confirmar todos los cambios
    await t.commit();

    res.json({ message: "Cuenta eliminada correctamente." });

  } catch (error) {
    if (t) await t.rollback();
    console.error("Error al eliminar cuenta:", error);
    res.status(500).json({
      message: "Error al eliminar la cuenta",
      error: error.message
    });
  }
};