// services/airline.services.js
import { Airline } from "../models/Airline.js";
import { User } from "../models/User.js";
import bcrypt from "bcrypt";

// Obtener todas las aerolíneas
export const getAirlines = async (req, res) => {
  try {
    const airlines = await Airline.findAll({
      attributes: { exclude: ["password"] }, // Excluir la contraseña al obtener aerolíneas
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
    // Validar si la aerolínea ya existe por email en la tabla Airline
    const existingAirlineInAirlineTable = await Airline.findOne({
      where: { email },
    });

    if (existingAirlineInAirlineTable) {
      return res
        .status(400)
        .json({ message: "Ya existe una aerolínea con este email." });
    }

    // Validar si el email ya está en uso en la tabla User
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        message: "Este email ya está registrado como usuario en el sistema.",
      });
    }

    // Validar si el nombre de la aerolínea ya está en uso
    const existingUserWithName = await User.findOne({ where: { name } });
    if (existingUserWithName) {
      return res.status(400).json({
        message: "Este nombre de aerolínea ya está en uso como usuario.",
      });
    }

    // Encriptar la contraseña
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Crear el registro de la aerolínea en la tabla Airline
    const newAirline = await Airline.create({
      name,
      code,
      cuit,
      email,
      password: hashedPassword,
      role: "airline", // Asignar el rol por defecto en la tabla Airline
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

    // Actualiza la aerolínea en la tabla Airline
    airline.name = name;
    airline.code = code;
    airline.cuit = cuit;
    airline.email = email;
    await airline.save();

    // Actualiza el usuario asociado en la tabla User si el email o nombre cambiaron
    const userToUpdate = await User.findOne({
      where: { email: airline.email },
    });
    if (userToUpdate) {
      userToUpdate.name = name;
      userToUpdate.email = email;
      await userToUpdate.save();
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

    await User.destroy({
      where: { email: airlineToDelete.email },
    });

    const deletedRows = await Airline.destroy({
      where: { id },
    });

    if (deletedRows === 0) {
      return res.status(404).json({
        message: "Aerolínea no encontrada (después de intentar eliminar).",
      });
    }
    res.status(204).send();
  } catch (error) {
    console.error("Error al eliminar aerolínea:", error);
    res
      .status(500)
      .json({ message: "Error al eliminar aerolínea", error: error.message });
  }
};
