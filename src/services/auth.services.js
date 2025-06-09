import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";

// Middleware para verificar el token JWT en las solicitudes
export const verifyToken = (req, res, next) => {
  const header = req.header("Authorization") || "";
  const token = header.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "No posee autorización requerida" });
  }

  try {
    const payload = jwt.verify(token, "programacion3-2025");
    req.user = payload;
    next();
  } catch (error) {
    return res.status(403).json({ message: "No posee permisos correctos" });
  }
};

export const registerUser = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    // Verificar si el usuario ya existe por email
    const userExists = await User.findOne({ where: { email } });

    if (userExists) {
      return res
        .status(400)
        .json({ message: "Este email ya se encuentra registrado." });
    }

    // Verificar si el nombre ya está en uso
    const nameExists = await User.findOne({ where: { name } });

    if (nameExists) {
      return res
        .status(400)
        .json({ message: "Este nombre de usuario ya está en uso." });
    }

    // Encriptar la contraseña
    const saltRounds = 10;
    const salt = await bcrypt.genSalt(saltRounds);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Crear el nuevo usuario con los campos exactos que vienen del frontend
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    res.status(201).json({ id: newUser.id });
  } catch (error) {
    console.error("Error al registrar usuario:", error);
    res
      .status(500)
      .json({ message: "Error al registrar usuario", error: error.message });
  }
};

export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(401).json({ message: "Usuario no existente" });
    }

    const comparison = await bcrypt.compare(password, user.password);

    if (!comparison) {
      return res
        .status(401)
        .json({ message: "Email y/o contraseña incorrecta" });
    }

    const secretKey = "programacion3-2025";
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      secretKey,
      { expiresIn: "1h" }
    );

    return res.send(token);
  } catch (error) {
    console.error("Error al iniciar sesión:", error);
    return res
      .status(500)
      .json({ message: "Error al iniciar sesión", error: error.message });
  }
};
