import { Router } from "express";
import {
  getMyProfile,
  updateUserProfile,
  deleteUserProfileWithBookings,
} from "../services/users.services.js";
import { verifyToken } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/upload.middleware.js";

const router = Router();

// Rutas para usuario regular
router.get("/users/profile/me", verifyToken, getMyProfile);
// Usar `upload.single` para procesar el archivo 'profilePicture'
router.put("/users/profile/me", verifyToken, upload.single("profilePicture"), updateUserProfile);
router.delete(
  "/users/profile/me/with-bookings",
  verifyToken,
  deleteUserProfileWithBookings
);


export default router;