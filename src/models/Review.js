import { DataTypes } from "sequelize"
import { sequelize } from "../db.js"
import { User } from "./User.js"
import { Flight } from "./Flight.js"

export const Review = sequelize.define(
  "review",
  {
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
        key: "id",
      },
    },
    flightId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Flight,
        key: "id",
      },
    },
    airline: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    rating: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 5,
      },
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
  },
  {
    timestamps: true,
  },
)

// Definir relaciones
Review.belongsTo(User, { foreignKey: "userId", as: "user" })
Review.belongsTo(Flight, { foreignKey: "flightId", as: "flight" })

// Relaciones inversas
User.hasMany(Review, { foreignKey: "userId", as: "reviews" })
Flight.hasMany(Review, { foreignKey: "flightId", as: "reviews" })
