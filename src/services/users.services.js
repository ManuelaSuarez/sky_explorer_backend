import bcrypt from "bcrypt";
import { User } from "../models/User.js";

// Obtener todos los usuarios
export const getUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'name', 'email', 'role', 'isActive', 'createdAt'],
      order: [["id", "DESC"]],
    });

    return res.json(users);
  } catch (error) {
    console.error("Error al obtener usuarios:", error);
    return res.status(500).json({
      message: "Error al obtener los usuarios",
      error: error.message,
    });
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
    console.error("Error al obtener usuario:", error);
    return res.status(500).json({
      message: "Error al obtener el usuario",
      error: error.message,
    });
  }
};

// Crear un nuevo usuario (para admin)
export const createUser = async (req, res) => {
  try {
    const { 
      username, 
      name, 
      birthday, 
      nationality, 
      dni, 
      phone, 
      email, 
      confirmEmail, 
      password, 
      confirmPassword,
      role = 'user'
    } = req.body;

    // Validar campos requeridos
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Nombre, email y contraseña son obligatorios" });
    }

    // Validar que las contraseñas coincidan
    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Las contraseñas no coinciden" });
    }

    // Validar que los emails coincidan
    if (email !== confirmEmail) {
      return res.status(400).json({ message: "Los correos electrónicos no coinciden" });
    }

    // Verificar si el usuario ya existe por email
    const userExists = await User.findOne({ where: { email } });
    if (userExists) {
      return res.status(400).json({ message: "Este email ya se encuentra registrado" });
    }

    // Verificar si el nombre ya está en uso
    const nameExists = await User.findOne({ where: { name } });
    if (nameExists) {
      return res.status(400).json({ message: "Este nombre de usuario ya está en uso" });
    }

    // Encriptar la contraseña
    const saltRounds = 10;
    const salt = await bcrypt.genSalt(saltRounds);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Crear el nuevo usuario
    const newUser = await User.create({
      name: username || name,
      email,
      password: hashedPassword,
      role: role,
      birthday,
      nationality,
      dni,
      phone,
      isActive: true
    });

    // Devolver el usuario sin la contraseña
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

// Actualizar un usuario existente
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, isActive } = req.body;

    // Verificar si el usuario existe
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    // Si se está cambiando el email, verificar que no exista otro usuario con ese email
    if (email && email !== user.email) {
      const emailExists = await User.findOne({ 
        where: { 
          email,
          id: { [Op.ne]: id } // Excluir el usuario actual
        } 
      });
      if (emailExists) {
        return res.status(400).json({ message: "Este email ya está en uso por otro usuario" });
      }
    }

    // Si se está cambiando el nombre, verificar que no exista otro usuario con ese nombre
    if (name && name !== user.name) {
      const nameExists = await User.findOne({ 
        where: { 
          name,
          id: { [Op.ne]: id } // Excluir el usuario actual
        } 
      });
      if (nameExists) {
        return res.status(400).json({ message: "Este nombre ya está en uso por otro usuario" });
      }
    }

    // Actualizar el usuario
    await user.update({
      name: name || user.name,
      email: email || user.email,
      role: role || user.role,
      isActive: isActive !== undefined ? isActive : user.isActive
    });

    // Devolver el usuario actualizado sin la contraseña
    const userResponse = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      updatedAt: user.updatedAt
    };

    res.json(userResponse);
  } catch (error) {
    console.error("Error al actualizar usuario:", error);
    res.status(500).json({ message: "Error al actualizar el usuario", error: error.message });
  }
};

// Eliminar un usuario
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar si el usuario existe
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    // Prevenir que el admin se elimine a sí mismo
    if (req.user.id === parseInt(id)) {
      return res.status(400).json({ message: "No puedes eliminar tu propia cuenta" });
    }

    // Eliminar el usuario
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

    // Verificar si el usuario existe
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    // Prevenir que el admin se desactive a sí mismo
    if (req.user.id === parseInt(id)) {
      return res.status(400).json({ message: "No puedes desactivar tu propia cuenta" });
    }

    // Cambiar el estado del usuario
    const newStatus = !user.isActive;
    await user.update({ isActive: newStatus });

    const userResponse = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      updatedAt: user.updatedAt
    };

    res.json({ 
      message: `Usuario ${newStatus ? 'activado' : 'desactivado'} correctamente`, 
      user: userResponse 
    });
  } catch (error) {
    console.error("Error al cambiar estado del usuario:", error);
    res.status(500).json({ message: "Error al cambiar el estado del usuario", error: error.message });
  }
};

// Cambiar rol de usuario
export const changeUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    // Validar que el rol sea válido
    const validRoles = ['admin', 'user'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: "Rol inválido" });
    }

    // Verificar si el usuario existe
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    // Prevenir que el admin cambie su propio rol
    if (req.user.id === parseInt(id)) {
      return res.status(400).json({ message: "No puedes cambiar tu propio rol" });
    }

    // Cambiar el rol del usuario
    await user.update({ role });

    const userResponse = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      updatedAt: user.updatedAt
    };

    res.json({ 
      message: `Rol del usuario cambiado a ${role} correctamente`, 
      user: userResponse 
    });
  } catch (error) {
    console.error("Error al cambiar rol del usuario:", error);
    res.status(500).json({ message: "Error al cambiar el rol del usuario", error: error.message });
  }
};