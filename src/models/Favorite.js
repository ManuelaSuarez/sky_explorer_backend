import { DataTypes } from "sequelize";
import { sequelize } from "../db.js";
import { User } from "./User.js";
import { Flight } from "./Flight.js";

export const Favorite = sequelize.define(
  "favorite",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: User, key: "id" },
    },
    flightId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: Flight, key: "id" },
    },
  },
  {
    tableName: "favorites",
    timestamps: true,
    indexes: [
      { unique: true, fields: ["userId", "flightId"] }, // evita duplicados
    ],
  }
);

/*  associations  */
User.belongsToMany(Flight, { through: Favorite, as: "favFlights", foreignKey: "userId" });
Flight.belongsToMany(User, { through: Favorite, as: "favUsers", foreignKey: "flightId" });

Favorite.belongsTo(User, { foreignKey: "userId", as: "user" });
Favorite.belongsTo(Flight, { foreignKey: "flightId", as: "flight" });