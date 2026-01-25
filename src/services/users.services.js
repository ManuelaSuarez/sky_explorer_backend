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
// FUNCIONES USUARIO REGULAR
// ==========================================

// Ver mi perfil
export const getMyProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: [
        "id",
        "name",
        "email",
        "role",
        "profilePicture",
        "createdAt",
      ],
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
        const oldPath = path.join(
          "uploads",
          "profile-pictures",
          user.profilePicture
        );
        try {
          await fs.unlink(oldPath);
        } catch (e) {}
      }
      user.profilePicture = file.filename;
    } else if (req.body.profilePicture === "delete" && user.profilePicture) {
      const oldPath = path.join(
        "uploads",
        "profile-pictures",
        user.profilePicture
      );
      try {
        await fs.unlink(oldPath);
      } catch (e) {}
      user.profilePicture = null;
    }

    // Manejo de contraseña
    if (newPassword) {
      if (!currentPassword)
        return res
          .status(400)
          .json({ message: "Debes ingresar tu contraseña actual." });
      const isValid = await bcrypt.compare(currentPassword, user.password);
      if (!isValid)
        return res
          .status(400)
          .json({ message: "La contraseña actual es incorrecta." });
      user.password = await bcrypt.hash(newPassword, 10);
    }

    if (name) user.name = name;
    if (email) user.email = email;

    await user.save();

    // Sincronización si es aerolínea
    if (user.role === "airline" && name && oldName !== name) {
      await Flight.update(
        { airline: name },
        { where: { [Op.or]: [{ airline: oldName }, { createdBy: user.id }] } }
      );
      await Review.update({ airline: name }, { where: { airline: oldName } });
      const airlineRecord = await Airline.findOne({
        where: { email: user.email },
      });
      if (airlineRecord) {
        airlineRecord.name = name;
        await airlineRecord.save();
      }
    }

    res.json({ message: "Perfil actualizado correctamente.", user });
  } catch (error) {
    console.error("Error al actualizar perfil:", error);
    res.status(500).json({ message: "No se pudo actualizar el perfil." });
  }
};

// Eliminar mi propia cuenta
export const deleteUserProfileWithBookings = async (req, res) => {
  const t = await User.sequelize.transaction();
  try {
    console.log("Iniciando eliminación de cuenta con reservas...");

    const user = await User.findByPk(req.user.id, { transaction: t });

    //  PROTECCIÓN PARA ADMIN ===
    if (user.role === "admin") {
      await t.rollback();
      return res.status(403).json({
        message: "Las cuentas de administrador no pueden ser eliminadas.",
      });
    }

    console.log("Usuario encontrado:", user.id, "Rol:", user.role);

    const now = new Date();
    const today = now.toISOString().split("T")[0];

    if (user.role === "user") {
      const bookingsWithFutureFlights = await Booking.findAll({
        where: { userId: user.id },
        include: [
          {
            model: Flight,
            as: "flight",
            where: { date: { [Op.gte]: today } },
          },
        ],
        transaction: t,
      });

      if (bookingsWithFutureFlights.length > 0) {
        await t.rollback();
        return res.status(400).json({
          message:
            "No puedes eliminar tu cuenta mientras tengas viajes pendientes.",
        });
      }
    }

    if (user.role === "airline") {
      const flights = await Flight.findAll({
        where: { [Op.or]: [{ airline: user.name }, { createdBy: user.id }] },
        transaction: t,
      });

      for (const flight of flights) {
        const bookingsCount = await Booking.count({
          where: { flightId: flight.id },
          include: [
            {
              model: Flight,
              as: "flight",
              where: { date: { [Op.gte]: today } },
            },
          ],
          transaction: t,
        });

        if (bookingsCount > 0) {
          await t.rollback();
          return res.status(400).json({
            message:
              "No puedes eliminar la aerolínea porque existen vuelos con pasajeros registrados.",
          });
        }
        await Favorite.destroy({
          where: { flightId: flight.id },
          transaction: t,
        });
        await Booking.destroy({
          where: { flightId: flight.id },
          transaction: t,
        });
        await flight.destroy({ transaction: t });
      }
      await Airline.destroy({ where: { email: user.email }, transaction: t });
    }

    console.log("Limpiando datos del usuario...");

    // Limpieza de seguridad para evitar errores de Foreign Key
    await Flight.destroy({ where: { createdBy: user.id }, transaction: t });

    // Diferenciar reseñas según rol
    if (user.role === "airline") {
      await Review.destroy({ where: { airline: user.name }, transaction: t });
    } else {
      await Review.destroy({ where: { userId: user.id }, transaction: t });
    }

    await Favorite.destroy({ where: { userId: user.id }, transaction: t });
    await Booking.destroy({ where: { userId: user.id }, transaction: t });

    if (user.profilePicture) {
      const imagePath = path.join(
        "uploads",
        "profile-pictures",
        user.profilePicture
      );
      try {
        await fs.unlink(imagePath);
      } catch (err) {}
    }

    await user.destroy({ transaction: t });
    await t.commit();

    res.json({ message: "Tu cuenta ha sido eliminada exitosamente." });
  } catch (error) {
    if (t) await t.rollback();
    console.error("Error al eliminar cuenta:", error);
    res
      .status(500)
      .json({ message: "No se pudo completar la eliminación de la cuenta." });
  }
};
