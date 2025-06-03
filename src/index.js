// index.js
import express from "express"
import { PORT } from "./config.js"
import authRoutes from "./routes/auth.routes.js"
import flightRoutes from "./routes/flight.routes.js"
import usersRoutes from "./routes/users.routes.js"
import airlineRoutes from "./routes/airline.routes.js"
import bookingRoutes from "./routes/booking.routes.js"
import { sequelize } from "./db.js"
import "./models/User.js"
import "./models/Flight.js"
import "./models/Airline.js" 
import  "./models/Booking.js" 
import cors from "cors"

const app = express()


app.use(express.json())


app.use(
  cors({
    origin: "http://localhost:5173", 
    credentials: true,
  }),
)

try {

  await sequelize.sync({ force: false }) 
  console.log("Tablas sincronizadas")


  app.use("/auth", authRoutes)
  app.use("/api", flightRoutes)
  app.use("/api", usersRoutes)
  app.use("/api", airlineRoutes) 
  app.use("/api", bookingRoutes)


  app.listen(PORT)
  console.log(`Server listening on port ${PORT}`)
} catch (error) {
  console.log("Error de inicialización:", error)
}