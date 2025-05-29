// models/Booking.js - Sin código de reserva
import { DataTypes } from "sequelize";
import { sequelize } from "../db.js";
import { User } from "./User.js";
import { Flight } from "./Flight.js";

export const Booking = sequelize.define("Booking", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  flightId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Flight,
      key: 'id'
    }
  },
  passengers: {
    type: DataTypes.JSON, // Almacena los datos de todos los pasajeros
    allowNull: false,
  },
  passengerCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  totalPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  purchaseDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  status: {
    type: DataTypes.ENUM('Activo', 'Inactivo', 'Cancelado'),
    defaultValue: 'Activo',
  },
}, {
  tableName: "bookings",
  timestamps: true,
});

// Definir asociaciones
Booking.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Booking.belongsTo(Flight, { foreignKey: 'flightId', as: 'flight' });

User.hasMany(Booking, { foreignKey: 'userId', as: 'bookings' });
Flight.hasMany(Booking, { foreignKey: 'flightId', as: 'bookings' });