import bcrypt from "bcrypt"; 
import jwt from "jsonwebtoken"; 
import { User } from "../models/User.js"; 
import { Booking } from "../models/Booking.js"; 
import { Op } from "sequelize"; 

// Obtener todos los usuarios
export const getUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'name', 'email', 'role', 'isActive', 'createdAt'],
      order: [["id", "DESC"]], 
    });
    return res.json(users);
  } catch (error) {
    console.error("Error al obtener los usuarios:", error);
    return res.status(500).json({ message: "Error al obtener los usuarios", error: error.message });
  }
};

// Obtener un usuario por ID
export const getUserById = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await User.findByPk(id, {
      attributes: ['id', 'name', 'email', 'role', 'isActive', 'createdAt']
    });
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }
    return res.json(user);
  } catch (error) {
    console.error("Error al obtener el usuario:", error);
    return res.status(500).json({ message: "Error al obtener el usuario", error: error.message });
  }
};

// Crear un nuevo usuario (usado para registro o por admin)
export const createUser = async (req, res) => {
  try {
    const { username, name, email, confirmEmail, password, confirmPassword, role = 'user' } = req.body;


    if (!name || !email || !password) {
      return res.status(400).json({ message: "Nombre, email y contraseña son requeridos" });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Las contraseñas no coinciden" });
    }
    if (email !== confirmEmail) {
      return res.status(400).json({ message: "Los emails no coinciden" });
    }

    // Verificar si el email ya está registrado
    const userExists = await User.findOne({ where: { email } });
    if (userExists) {
      return res.status(400).json({ message: "Este email ya se encuentra registrado" });
    }

    // Encriptar la contraseña
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Crear el nuevo usuario
    const newUser = await User.create({
      name: username || name, 
      email,
      password: hashedPassword,
      role: role,
      isActive: true 
    });

    // Retornar el usuario sin la contraseña
    const userResponse = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      isActive: newUser.isActive,
      createdAt: newUser.createdAt
    };
    res.status(201).json(userResponse);
  } catch (error) {
    console.error("Error al crear usuario:", error);
    res.status(500).json({ message: "Error al crear el usuario", error: error.message });
  }
};


export const updateUser = async (req, res) => {
  try {
    const { id } = req.params; // ID del usuario a actualizar
    const { name, email, password, role, isActive } = req.body; 

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    // Si el email se está cambiando, verificar que no haya otro usuario con ese email
    if (email && email !== user.email) {
      const emailExists = await User.findOne({
        where: {
          email,
          id: { [Op.ne]: id } 
        }
      });
      if (emailExists) {
        return res.status(400).json({ message: "Este email ya está en uso por otro usuario" });
      }
    }

    // Si se proporciona una nueva contraseña, encriptarla y actualizarla
    if (password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }

  
    if (name) user.name = name;
    if (email) user.email = email;
    if (role) user.role = role; 
    if (typeof isActive === 'boolean') user.isActive = isActive; 

    await user.save(); 

    // Retornar el usuario actualizado (sin la contraseña)
    const userResponse = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      updatedAt: user.updatedAt
    };

    res.json({ message: "Usuario actualizado correctamente", user: userResponse });
  } catch (error) {
    console.error("Error al actualizar usuario:", error);
    res.status(500).json({ message: "Error al actualizar el usuario", error: error.message });
  }
};

// Eliminar un usuario (para admin, con validación de reservas)
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });
    if (req.user.id === parseInt(id)) return res.status(400).json({ message: "No puedes eliminar tu propia cuenta" });
    const userBookings = await Booking.findAll({ where: { userId: id } });
    if (userBookings.length > 0) return res.status(400).json({ message: "No se puede eliminar el usuario porque tiene reservas asociadas." });
    await user.destroy();
    res.json({ message: "Usuario eliminado correctamente" });
  } catch (error) {
    console.error("Error al eliminar usuario:", error);
    res.status(500).json({ message: "Error al eliminar el usuario", error: error.message });
  }
};

// Cambiar el estado de un usuario (Activo/Inactivo)
export const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });
    if (req.user.id === parseInt(id)) return res.status(400).json({ message: "No puedes desactivar tu propia cuenta" });
    const newStatus = !user.isActive;
    await user.update({ isActive: newStatus });
    res.json({ message: `Usuario ${newStatus ? 'activado' : 'desactivado'} correctamente`, user: { id: user.id, name: user.name, isActive: user.isActive } });
  } catch (error) {
    console.error("Error al cambiar estado de usuario:", error);
    res.status(500).json({ message: "Error al cambiar el estado del usuario", error: error.message });
  }
};

// Cambiar rol de usuario
export const changeUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const validRoles = ['admin', 'user', 'airline']; 
    if (!validRoles.includes(role)) return res.status(400).json({ message: "Rol inválido" });
    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });
    if (req.user.id === parseInt(id)) return res.status(400).json({ message: "No puedes cambiar tu propio rol" });
    await user.update({ role });
    res.json({ message: `Rol del usuario cambiado a ${role} correctamente`, user: { id: user.id, name: user.name, role: user.role } });
  } catch (error) {
    console.error("Error al cambiar rol de usuario:", error);
    res.status(500).json({ message: "Error al cambiar el rol del usuario", error: error.message });
  }
};



// Obtener el perfil del usuario logueado (solo su propio perfil)
export const getMyProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'name', 'email', 'role', 'isActive', 'createdAt']
    });
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }
    return res.json(user);
  } catch (error) {
    console.error("Error al obtener perfil:", error);
    return res.status(500).json({ message: "Error al obtener el perfil", error: error.message });
  }
};

// Actualizar el perfil del usuario logueado (para el modal del frontend)
export const updateUserProfile = async (req, res) => {
  try {
    const { name, email, currentPassword, newPassword } = req.body;
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    if (newPassword) { // Solo si se proporciona una nueva contraseña
      if (!currentPassword) {
        return res.status(400).json({ message: "Debe proporcionar la contraseña actual" });
      }
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: "La contraseña actual es incorrecta" });
      }
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
    }

    if (name) user.name = name;
    if (email) user.email = email;

    await user.save();

    let token;
    // Si el email fue cambiado, generamos un nuevo token
    if (email && email !== user.email) {
      token = jwt.sign(
        { id: user.id, email: user.email, name: user.name, role: user.role },
        'programacion3-2025', 
        { expiresIn: '1h' }
      );
    }

    const response = {
      message: "Perfil actualizado correctamente",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    };
    if (token) response.token = token;

    res.json(response);
  } catch (error) {
    console.error("Error al actualizar perfil:", error);
    res.status(500).json({ message: "Error al actualizar el perfil", error: error.message });
  }
};

// Eliminar el perfil del usuario logueado (VALIDA si tiene reservas)
export const deleteUserProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });
    const userBookings = await Booking.findAll({ where: { userId: req.user.id } });
    if (userBookings.length > 0) {
      return res.status(400).json({
        message: "No puedes eliminar tu cuenta porque tienes reservas activas. Primero debes cancelarlas.",
        bookingsCount: userBookings.length
      });
    }
    await user.destroy();
    res.json({ message: "Cuenta eliminada correctamente" });
  } catch (error) {
    console.error("Error al eliminar cuenta:", error);
    res.status(500).json({ message: "Error al eliminar la cuenta", error: error.message });
  }
};

// Eliminar el perfil del usuario logueado Y TODAS sus reservas (la que usa el modal)
export const deleteUserProfileWithBookings = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });

    // Eliminar todas las reservas asociadas a este usuario PRIMERO
    await Booking.destroy({ where: { userId: req.user.id } });
    
  
    await user.destroy();

    res.json({ message: "Cuenta y todas las reservas eliminadas correctamente" });
  } catch (error) {
    console.error("Error al eliminar cuenta y reservas:", error);
    res.status(500).json({ message: "Error al eliminar la cuenta y sus reservas", error: error.message });
  }
};