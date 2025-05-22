import express from "express";
import { PORT } from "./config.js";
import authRoutes from "./routes/auth.routes.js";
import flightRoutes from "./routes/flight.routes.js";
import usersRoutes from "./routes/users.routes.js";
import airlinesRoutes from "./routes/airlines.routes.js";
import { sequelize } from "./db.js";
import "./models/User.js";
import "./models/Flight.js";
import "./models/Airline.js";
import cors from "cors";

const app = express();

// Middleware para parsear JSON
app.use(express.json());

// Configuración de CORS
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

try {
  // Sincronizar modelos con la base de datos
  await sequelize.sync({ force: false });
  console.log("Tablas sincronizadas");

  // Configurar rutas
  app.use("/auth", authRoutes);
  app.use("/api", flightRoutes);
  app.use("/api", usersRoutes);
  app.use("/api", airlinesRoutes);

  // Iniciar servidor
  app.listen(PORT);
  console.log(`Server listening on port ${PORT}`);
} catch (error) {
  console.log("Error de inicialización:", error);
}
