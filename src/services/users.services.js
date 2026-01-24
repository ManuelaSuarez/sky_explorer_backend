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

// ==========================================
// FUNCIONES ADMIN
// ==========================================

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
    res.status(500).json({ message: "No se pudieron cargar los usuarios." });
  }
};

// Obtener un usuario específico
export const getUserById = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: ["id", "name", "email", "role", "createdAt"],
    });

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado." });
    }

    res.json(user);
  } catch (error) {
    console.error("Error al obtener usuario:", error);
    res.status(500).json({ message: "Error al obtener la información del usuario." });
  }
};

// Crear usuario de aerolínea
export const createUser = async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Todos los campos son obligatorios." });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Las contraseñas no coinciden." });
    }

    const userExists = await User.findOne({ where: { email } });
    if (userExists) {
      return res.status(400).json({ message: "Este correo electrónico ya está registrado." });
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
    res.status(500).json({ message: "No se pudo crear el usuario." });
  }
};

// Actualizar usuario de aerolínea (Admin)
export const updateUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado." });
    }

    if (email && email !== user.email) {
      const emailExists = await User.findOne({
        where: { email, id: { [Op.ne]: req.params.id } },
      });
      if (emailExists) {
        return res.status(400).json({ message: "El correo electrónico ya está en uso." });
      }
    }

    if (name) user.name = name;
    if (email) user.email = email;
    if (password) {
      user.password = await bcrypt.hash(password, 10);
    }

    await user.save();

    res.json({
      message: "Usuario actualizado correctamente.",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Error al actualizar usuario:", error);
    res.status(500).json({ message: "No se pudo actualizar la información." });
  }
};

// Eliminar o aerolínea (ADMIN)
export const deleteUser = async (req, res) => {
  const t = await User.sequelize.transaction();
  try {
    const user = await User.findByPk(req.params.id, { transaction: t });
    if (!user) {
      await t.rollback();
      return res.status(404).json({ message: "El usuario no existe." });
    }

    // 1. SI ES AEROLÍNEA: Validar vuelos con pasajeros
    if (user.role === "airline") {
      const flights = await Flight.findAll({
        where: { [Op.or]: [{ airline: user.name }, { createdBy: user.id }] },
        transaction: t
      });

      for (const flight of flights) {
        const activeBookings = await Booking.count({
          where: { flightId: flight.id, status: "Activo" },
          transaction: t
        });

        if (activeBookings > 0) {
          await t.rollback();
          return res.status(400).json({ 
            message: "No se puede eliminar la aerolínea porque tiene vuelos con reservas activas." 
          });
        }

        // Limpieza de datos del vuelo
        await Favorite.destroy({ where: { flightId: flight.id }, transaction: t });
        await Booking.destroy({ where: { flightId: flight.id }, transaction: t });
        await flight.destroy({ transaction: t });
      }
      
      await Review.destroy({ where: { airline: user.name }, transaction: t });
      await Airline.destroy({ where: { email: user.email }, transaction: t });
    }

    // 2. SI ES USUARIO (PASAJERO)
    if (user.role === "user") {
      const activeBookings = await Booking.count({
        where: { userId: user.id, status: "Activo" },
        transaction: t
      });

      if (activeBookings > 0) {
        await t.rollback();
        return res.status(400).json({ 
          message: "No se puede eliminar el usuario porque tiene reservas de viaje pendientes." 
        });
      }
    }

    // 3. LIMPIEZA FINAL
    await Review.destroy({ where: { userId: user.id }, transaction: t });
    await Favorite.destroy({ where: { userId: user.id }, transaction: t });
    await Booking.destroy({ where: { userId: user.id }, transaction: t });

    if (user.profilePicture) {
      const imagePath = path.join("uploads", "profile-pictures", user.profilePicture);
      try { await fs.unlink(imagePath); } catch (err) { console.log("Foto no encontrada."); }
    }

    await user.destroy({ transaction: t });
    await t.commit();

    res.json({ message: "Usuario eliminado correctamente." });
  } catch (error) {
    if (t) await t.rollback();
    res.status(500).json({ message: "Hubo un error al procesar la eliminación." });
  }
};

// ==========================================
// FUNCIONES USUARIO REGULAR
// ==========================================

// Ver mi perfil
export const getMyProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ["id", "name", "email", "role", "profilePicture", "createdAt"],
    });

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado." });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener el perfil." });
  }
};

// Editar mi perfil
export const updateUserProfile = async (req, res) => {
  try {
    const { name, email, currentPassword, newPassword } = req.body;
    const user = await User.findByPk(req.user.id);
    const file = req.file;

    if (!user) {
      if (file) await fs.unlink(file.path);
      return res.status(404).json({ message: "Usuario no encontrado." });
    }

    const oldName = user.name;

    // Manejo de imagen de perfil
    if (file) {
      if (user.profilePicture) {
        const oldPath = path.join("uploads", "profile-pictures", user.profilePicture);
        try { await fs.unlink(oldPath); } catch (e) {}
      }
      user.profilePicture = file.filename;
    } else if (req.body.profilePicture === "delete" && user.profilePicture) {
      const oldPath = path.join("uploads", "profile-pictures", user.profilePicture);
      try { await fs.unlink(oldPath); } catch (e) {}
      user.profilePicture = null;
    }

    // Manejo de contraseña
    if (newPassword) {
      if (!currentPassword) return res.status(400).json({ message: "Debes ingresar tu contraseña actual." });
      const isValid = await bcrypt.compare(currentPassword, user.password);
      if (!isValid) return res.status(400).json({ message: "La contraseña actual es incorrecta." });
      user.password = await bcrypt.hash(newPassword, 10);
    }

    if (name) user.name = name;
    if (email) user.email = email;

    await user.save();

    // Sincronización si es aerolínea
    if (user.role === "airline" && name && oldName !== name) {
      await Flight.update({ airline: name }, { where: { [Op.or]: [{ airline: oldName }, { createdBy: user.id }] } });
      await Review.update({ airline: name }, { where: { airline: oldName } });
      const airlineRecord = await Airline.findOne({ where: { email: user.email } });
      if (airlineRecord) {
        airlineRecord.name = name;
        await airlineRecord.save();
      }
    }

    res.json({ message: "Perfil actualizado correctamente.", user });
  } catch (error) {
    res.status(500).json({ message: "No se pudo actualizar el perfil." });
  }
};

// Eliminar mi propia cuenta
export const deleteUserProfileWithBookings = async (req, res) => {
  const t = await User.sequelize.transaction();
  try {
    const user = await User.findByPk(req.user.id, { transaction: t });
    const now = new Date();

    if (user.role === "user") {
      const activeBookings = await Booking.count({
        where: { userId: user.id, status: "Activo" },
        transaction: t
      });

      if (activeBookings > 0) {
        await t.rollback();
        return res.status(400).json({ message: "No puedes eliminar tu cuenta mientras tengas viajes pendientes." });
      }
    }

    if (user.role === "airline") {
      const flights = await Flight.findAll({
        where: { [Op.or]: [{ airline: user.name }, { createdBy: user.id }] },
        transaction: t
      });

      for (const flight of flights) {
        const bookingsCount = await Booking.count({ 
          where: { flightId: flight.id, status: "Activo" }, 
          transaction: t 
        });

        if (bookingsCount > 0) {
          await t.rollback();
          return res.status(400).json({ message: "No puedes eliminar la aerolínea porque existen vuelos con pasajeros registrados." });
        }
        await Favorite.destroy({ where: { flightId: flight.id }, transaction: t });
        await Booking.destroy({ where: { flightId: flight.id }, transaction: t });
        await flight.destroy({ transaction: t });
      }
      await Airline.destroy({ where: { email: user.email }, transaction: t });
    }

    await Review.destroy({ where: { userId: user.id }, transaction: t });
    await Favorite.destroy({ where: { userId: user.id }, transaction: t });
    await Booking.destroy({ where: { userId: user.id }, transaction: t });

    if (user.profilePicture) {
      const imagePath = path.join("uploads", "profile-pictures", user.profilePicture);
      try { await fs.unlink(imagePath); } catch (err) {}
    }

    await user.destroy({ transaction: t });
    await t.commit();
    res.json({ message: "Tu cuenta ha sido eliminada exitosamente." });

  } catch (error) {
    if (t) await t.rollback();
    res.status(500).json({ message: "No se pudo completar la eliminación de la cuenta." });
  }
};