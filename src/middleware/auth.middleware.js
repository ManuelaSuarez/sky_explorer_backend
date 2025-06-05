// middleware/auth.middleware.js
import jwt from "jsonwebtoken"
import { User } from "../models/User.js"

// Middleware para verificar si el usuario está autenticado
export const verifyToken = async (req, res, next) => {
  try {
    // Obtener el token del header Authorization
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No autorizado - Token no proporcionado" })
    }

    const token = authHeader.split(" ")[1]

    // Verificar el token
    const decoded = jwt.verify(token, "programacion3-2025") // Usar tu clave secreta real

    // Buscar el usuario en la base de datos para obtener el rol actualizado
    const user = await User.findOne({ where: { email: decoded.email } })

    if (!user) {
      return res.status(401).json({ message: "No autorizado - Usuario no encontrado" })
    }

    // Añadir la información del usuario al objeto request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name // Ahora este rol puede ser 'admin', 'user' o 'airline'
    }

    next()
  } catch (error) {
    return res.status(401).json({ message: "No autorizado - Token inválido" })
  }
}

// Middleware para verificar si el usuario es administrador
export const checkAdmin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next()
  } else {
    return res.status(403).json({ message: "Acceso denegado - Se requiere rol de administrador" })
  }
}

// Middleware para verificar si el usuario es un usuario regular (solo 'user')
export const isUser = (req, res, next) => {
  if (req.user && req.user.role === "user") { 
    next()
  } else {
    return res.status(403).json({ message: "Acceso denegado - Se requiere rol de usuario regular" })
  }
}

// NUEVO Middleware para verificar si el usuario es 'admin' o 'airline'
export const checkAdminOrAirline = (req, res, next) => {
  if (req.user && (req.user.role === "admin" || req.user.role === "airline")) {
    next()
  } else {
    return res.status(403).json({ message: "Acceso denegado - Se requiere rol de administrador o aerolínea" })
  }
}