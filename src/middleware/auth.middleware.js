import jwt from "jsonwebtoken";
import { User } from "../models/User.js";

// Middleware para verificar si el usuario está autenticado
export const verifyToken = async (req, res, next) => {
  try {
    // Obtener el token del header Authorization
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ message: "No se proporcionó token de autenticación" });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res
        .status(401)
        .json({ message: "No se proporcionó token de autenticación" });
    }

    // Verificar el token con la clave secreta correcta
    const decoded = jwt.verify(token, "programacion3-2025");

    // Buscar el usuario en la base de datos
    const user = await User.findByPk(decoded.id);

    if (!user) {
      return res.status(401).json({ message: "Usuario no encontrado" });
    }

    // Guardar el usuario en el objeto request para uso posterior
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    console.log("Usuario autenticado:", req.user); // Log para depuración

    next();
  } catch (error) {
    console.error("Error de autenticación:", error);

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Token inválido" });
    }

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expirado" });
    }

    return res
      .status(500)
      .json({ message: "Error de autenticación", error: error.message });
  }
};

// Middleware para verificar si el usuario es administrador
export const isAdmin = (req, res, next) => {
  console.log("Verificando rol de administrador:", req.user); // Log para depuración

  // Verificar si el usuario existe y si su rol es 'admin'
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    return res
      .status(403)
      .json({ message: "Acceso denegado - Se requiere rol de administrador" });
  }
};

// Middleware para verificar si el usuario es un usuario regular
export const isUser = (req, res, next) => {
  if (req.user && (req.user.role === "usuario" || req.user.role === "admin")) {
    next();
  } else {
    return res
      .status(403)
      .json({ message: "Acceso denegado - Se requiere rol de usuario" });
  }
};
