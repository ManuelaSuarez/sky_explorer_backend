import { Router } from "express";
import createPaymentPreference from "../services/payment.services.js"
import { verifyToken } from "../services/auth.services.js"

const router = Router();

// Ruta crear preferencia de pago
router.post("/payment", verifyToken, createPaymentPreference)

//
router.post("/payment/webhook", async (req, res) => {
  console.log("Notificación de MP:", req.body);
    res.sendStatus(200);
});

export default router;