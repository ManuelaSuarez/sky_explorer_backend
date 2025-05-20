import express from "express";
import { PORT } from "./config.js";
import authRoutes from "./routes/auth.routes.js";
import { sequelize } from "./db.js";
import "./models/User.js";
import cors from "cors";

const app = express();

// Agrega esto ANTES de las rutas
app.use(express.json());

app.use(
  cors({
    origin: "http://localhost:5173",
  })
);

try {
  // Forzar recreación de tablas (solo en desarrollo)
  await sequelize.sync();
  console.log("Tablas sincronizadas");

  app.listen(PORT);
  app.use("/auth", authRoutes);

  console.log(`Server listening on port ${PORT}`);
} catch (error) {
  console.log("Error de inicialización:", error);
}
