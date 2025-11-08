import multer from "multer";
import path from "path";
import fs from "fs";

// Directorio para fotos de perfil
const uploadDir = path.resolve("uploads", "profile-pictures");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "profilePicture-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (_req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Solo se permiten archivos de imagen"), false);
  }
};

export const upload = multer({ storage, fileFilter });

// Para imágenes de vuelos
const storageFlight = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.resolve("uploads", "flights");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `flight-${Date.now()}${ext}`);
  },
});

export const uploadFlight = multer({ storage: storageFlight, fileFilter });