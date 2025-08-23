import bcrypt from "bcrypt";
import { User } from "../models/User.js";
import { Booking } from "../models/Booking.js";
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

    // Validaciones básicas
    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: "Nombre, email y contraseña son requeridos" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Las contraseñas no coinciden" });
    }

    // Verificar si el email ya existe
    const userExists = await User.findOne({ where: { email } });
    if (userExists) {
      return res.status(400).json({ message: "Este email ya está registrado" });
    }

    // Crear usuario
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "airline",
    });

    // Responder sin la contraseña
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

    // Verificar email único
    if (email && email !== user.email) {
      const emailExists = await User.findOne({
        where: { email, id: { [Op.ne]: req.params.id } },
      });
      if (emailExists) {
        return res.status(400).json({ message: "Este email ya está en uso" });
      }
    }

    // Actualizar campos
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

// Eliminar usuario de aerolínea
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    // No puede eliminarse a sí mismo
    if (req.user.id === parseInt(req.params.id)) {
      return res
        .status(400)
        .json({ message: "No puedes eliminar tu propia cuenta" });
    }

    // Verificar si tiene reservas
    const bookingsCount = await Booking.count({
      where: { userId: req.params.id },
    });
    if (bookingsCount > 0) {
      return res.status(400).json({
        message: "No se puede eliminar: el usuario tiene reservas asociadas",
      });
    }

    await user.destroy();
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

    // Lógica para manejar la imagen de perfil
    if (file) {
      // Si se subió un nuevo archivo, eliminar el anterior (si existe)
      if (user.profilePicture) {
        const oldImagePath = path.join("uploads", "profile-pictures", user.profilePicture);
        // Verificar si el archivo existe antes de intentar eliminarlo
        try {
          await fs.access(oldImagePath);
          await fs.unlink(oldImagePath);
        } catch (error) {
          console.log("No se pudo eliminar el archivo anterior:", error.message);
        }
      }
      // Guardar la nueva URL del archivo
      user.profilePicture = file.filename;
    } else if (req.body.profilePicture === "delete" && user.profilePicture) {
      // Lógica para eliminar la foto de perfil
      const imagePath = path.join("uploads", "profile-pictures", user.profilePicture);
      try {
        await fs.access(imagePath);
        await fs.unlink(imagePath);
      } catch (error) {
        console.log("No se pudo eliminar el archivo:", error.message);
      }
      user.profilePicture = null;
    }

    // Si quiere cambiar contraseña, validar la actual
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

    // Actualizar otros campos
    if (name) user.name = name;
    if (email) user.email = email;

    await user.save();

    res.json({
      message: "Perfil actualizado",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture, // Asegurarse de enviar la URL actualizada
      },
    });
  } catch (error) {
    console.error("Error al actualizar perfil:", error);
    res.status(500).json({ message: "Error al actualizar perfil" });
  }
};

// Eliminar mi cuenta (con todas mis reservas)
export const deleteUserProfileWithBookings = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    // Eliminar la foto de perfil del disco antes de eliminar al usuario
    if (user.profilePicture) {
        const imagePath = path.join("uploads", "profile-pictures", user.profilePicture);
        try {
            await fs.access(imagePath);
            await fs.unlink(imagePath);
        } catch (error) {
            console.log("No se pudo eliminar la foto de perfil al eliminar el usuario:", error.message);
        }
    }

    // Eliminar primero todas las reservas del usuario
    await Booking.destroy({ where: { userId: req.user.id } });

    // Luego eliminar el usuario
    await user.destroy();

    res.json({ message: "Cuenta eliminada correctamente" });
  } catch (error) {
    console.error("Error al eliminar cuenta:", error);
    res.status(500).json({ message: "Error al eliminar cuenta" });
  }
};