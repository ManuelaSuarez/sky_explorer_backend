import { MercadoPagoConfig, Preference } from "mercadopago"
import dotenv from "dotenv"

// Configuración de Dot Env
dotenv.config()

// Configuración Mercado Pago
const mercadopago = new MercadoPagoConfig({ access_token: process.env.MP_ACCESS_TOKEN }) 

const createPaymentPreference = async (req, res) => {
  try {
    const { flightId, passengers, totalPrice } = req.body;

    if (!flightId || !passengers || !totalPrice) {
      return res.status(400).json({ message: "Datos de pago incompletos" });
    }

    const preference = new Preference(mercadopago)

    const preferenceData = {
      body: {
        items: [
          {
            title: `Reserva de vuelo ${flightId}`,
            quantity: passengers.length,
            unit_price: totalPrice / passengers.length, 
            currency_id: "ARS",
          },
        ],
        back_urls: {
          success: "http://localhost:5173/myFlights",
          failure: "http://localhost:5173/failure",
          pending: "http://localhost:5173/pending",
        },
        auto_return: "approved", // Vuelve automáticamente si se aprueba
      }
    };    

    const response = await preference.create(preferenceData);

    res.json({ 
      id: response.body.id, 
      init_point: response.body.init_point 
    }); // le mando el ID al frontend
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
        message: "Error creando preferencia de pago",
        error: error.message
    });
  }
}

export default createPaymentPreference;