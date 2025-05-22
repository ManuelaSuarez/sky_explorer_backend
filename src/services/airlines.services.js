import { Airline } from "../models/Airline.js";
import bcrypt from "bcrypt";

// Crear una nueva aerolínea
export const createAirline = async (airlineData) => {
  try {
    // Verificar si ya existe una aerolínea con el mismo email o código
    const existingAirline = await Airline.findOne({
      where: {
        email: airlineData.email,
      },
    });

    if (existingAirline) {
      throw new Error("Ya existe una aerolínea con ese email");
    }

    const existingCode = await Airline.findOne({
      where: {
        code: airlineData.code,
      },
    });

    if (existingCode) {
      throw new Error("Ya existe una aerolínea con ese código IATA");
    }

    const existingCuit = await Airline.findOne({
      where: {
        cuit: airlineData.cuit,
      },
    });

    if (existingCuit) {
      throw new Error("Ya existe una aerolínea con ese CUIT");
    }

    // Encriptar la contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(airlineData.password, salt);

    // Crear la aerolínea con la contraseña encriptada
    const newAirline = await Airline.create({
      ...airlineData,
      password: hashedPassword,
      role: "airline", // Aseguramos que el rol sea siempre 'airline'
    });

    // Retornar la aerolínea creada sin la contraseña
    const { password, ...airlineWithoutPassword } = newAirline.toJSON();
    return airlineWithoutPassword;
  } catch (error) {
    throw error;
  }
};

// Obtener todas las aerolíneas
export const getAllAirlines = async () => {
  try {
    const airlines = await Airline.findAll({
      attributes: { exclude: ["password"] }, // Excluir la contraseña de los resultados
    });
    return airlines;
  } catch (error) {
    throw error;
  }
};

// Obtener una aerolínea por ID
export const getAirlineById = async (id) => {
  try {
    const airline = await Airline.findByPk(id, {
      attributes: { exclude: ["password"] }, // Excluir la contraseña
    });

    if (!airline) {
      throw new Error("Aerolínea no encontrada");
    }

    return airline;
  } catch (error) {
    throw error;
  }
};

// Actualizar una aerolínea
export const updateAirline = async (id, airlineData) => {
  try {
    const airline = await Airline.findByPk(id);

    if (!airline) {
      throw new Error("Aerolínea no encontrada");
    }

    // Si se está actualizando el email, verificar que no exista otro con ese email
    if (airlineData.email && airlineData.email !== airline.email) {
      const existingAirline = await Airline.findOne({
        where: {
          email: airlineData.email,
        },
      });

      if (existingAirline) {
        throw new Error("Ya existe una aerolínea con ese email");
      }
    }

    // Si se está actualizando el código, verificar que no exista otro con ese código
    if (airlineData.code && airlineData.code !== airline.code) {
      const existingCode = await Airline.findOne({
        where: {
          code: airlineData.code,
        },
      });

      if (existingCode) {
        throw new Error("Ya existe una aerolínea con ese código IATA");
      }
    }

    // Si se está actualizando el CUIT, verificar que no exista otro con ese CUIT
    if (airlineData.cuit && airlineData.cuit !== airline.cuit) {
      const existingCuit = await Airline.findOne({
        where: {
          cuit: airlineData.cuit,
        },
      });

      if (existingCuit) {
        throw new Error("Ya existe una aerolínea con ese CUIT");
      }
    }

    // Si se está actualizando la contraseña, encriptarla
    if (airlineData.password) {
      const salt = await bcrypt.genSalt(10);
      airlineData.password = await bcrypt.hash(airlineData.password, salt);
    }

    // Actualizar la aerolínea
    await airline.update(airlineData);

    // Obtener la aerolínea actualizada sin la contraseña
    const updatedAirline = await Airline.findByPk(id, {
      attributes: { exclude: ["password"] },
    });

    return updatedAirline;
  } catch (error) {
    throw error;
  }
};

// Eliminar una aerolínea
export const deleteAirline = async (id) => {
  try {
    const airline = await Airline.findByPk(id);

    if (!airline) {
      throw new Error("Aerolínea no encontrada");
    }

    await airline.destroy();
    return { message: "Aerolínea eliminada correctamente" };
  } catch (error) {
    throw error;
  }
};
