import { Review } from "../models/Review.js"
import { User } from "../models/User.js"
import { Flight } from "../models/Flight.js"

// Crear nueva reseña
export const createReview = async (req, res) => {
  try {
    const { flightId, airline, rating, comment } = req.body
    const userId = req.user.id

    // Verificar que el vuelo existe
    const flight = await Flight.findByPk(flightId)
    if (!flight) {
      return res.status(404).json({ message: "Vuelo no encontrado" })
    }

    // Verificar que el usuario no haya reseñado ya esta aerolinea
const existingReview = await Review.findOne({
  where: { userId, airline },
});

if (existingReview) {
  return res.status(400).json({
    message: "Ya has reseñado esta aerolínea",
  });
}

    // Crear la reseña
    const review = await Review.create({
      userId,
      flightId,
      airline,
      rating,
      comment,
    })

    // Obtener la reseña con información del usuario
    const reviewWithUser = await Review.findByPk(review.id, {
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "profilePicture"],
        },
      ],
    })

    res.status(201).json({
      message: "Reseña creada exitosamente",
      review: reviewWithUser,
    })
  } catch (error) {
    console.error("Error al crear reseña:", error)
    res.status(500).json({ message: "Error interno del servidor" })
  }
}

// Obtener todas las reseñas
export const getAllReviews = async (req, res) => {
  try {
    const reviews = await Review.findAll({
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "profilePicture"],
        },
        {
          model: Flight,
          as: "flight",
          attributes: ["id", "airline", "origin", "destination"],
        },
      ],
      order: [["createdAt", "DESC"]],
    })

    res.json(reviews)
  } catch (error) {
    console.error("Error al obtener reseñas:", error)
    res.status(500).json({ message: "Error interno del servidor" })
  }
}

// Obtener reseñas por vuelo
export const getReviewsByFlight = async (req, res) => {
  try {
    const { flightId } = req.params

    const reviews = await Review.findAll({
      where: { flightId },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "profilePicture"],
        },
      ],
      order: [["createdAt", "DESC"]],
    })

    res.json(reviews)
  } catch (error) {
    console.error("Error al obtener reseñas por vuelo:", error)
    res.status(500).json({ message: "Error interno del servidor" })
  }
}

// Obtener reseñas por aerolínea
export const getReviewsByAirline = async (req, res) => {
  try {
    const { airline } = req.params

    const reviews = await Review.findAll({
      where: { airline },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "profilePicture"],
        },
        {
          model: Flight,
          as: "flight",
          attributes: ["id", "origin", "destination", "date"],
        },
      ],
      order: [["createdAt", "DESC"]],
    })

    res.json(reviews)
  } catch (error) {
    console.error("Error al obtener reseñas por aerolínea:", error)
    res.status(500).json({ message: "Error interno del servidor" })
  }
}

// Obtener calificación promedio de aerolínea
export const getAirlineAverageRating = async (req, res) => {
  try {
    const { airline } = req.params

    const result = await Review.findAll({
      where: { airline },
      attributes: [
        [Review.sequelize.fn("AVG", Review.sequelize.col("rating")), "averageRating"],
        [Review.sequelize.fn("COUNT", Review.sequelize.col("id")), "totalReviews"],
      ],
      raw: true,
    })

    const averageRating = result[0]?.averageRating ? Number.parseFloat(result[0].averageRating).toFixed(1) : 0
    const totalReviews = result[0]?.totalReviews || 0

    res.json({
      airline,
      averageRating: Number.parseFloat(averageRating),
      totalReviews: Number.parseInt(totalReviews),
    })
  } catch (error) {
    console.error("Error al calcular promedio:", error)
    res.status(500).json({ message: "Error interno del servidor" })
  }
}

// Actualizar reseña
export const updateReview = async (req, res) => {
  try {
    const { id } = req.params
    const { rating, comment } = req.body
    const userId = req.user.id

    // Buscar la reseña
    const review = await Review.findByPk(id)
    if (!review) {
      return res.status(404).json({ message: "Reseña no encontrada" })
    }

    // Verificar que el usuario sea el propietario de la reseña
    if (review.userId !== userId) {
      return res.status(403).json({
        message: "No tienes permiso para editar esta reseña",
      })
    }

    // Actualizar la reseña
    await review.update({ rating, comment })

    // Obtener la reseña actualizada con información del usuario
    const updatedReview = await Review.findByPk(id, {
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "profilePicture"],
        },
      ],
    })

    res.json({
      message: "Reseña actualizada exitosamente",
      review: updatedReview,
    })
  } catch (error) {
    console.error("Error al actualizar reseña:", error)
    res.status(500).json({ message: "Error interno del servidor" })
  }
}

// Eliminar reseña
export const deleteReview = async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.id

    // Buscar la reseña
    const review = await Review.findByPk(id)
    if (!review) {
      return res.status(404).json({ message: "Reseña no encontrada" })
    }

    // Verificar que el usuario sea el propietario de la reseña
    if (review.userId !== userId) {
      return res.status(403).json({
        message: "No tienes permiso para eliminar esta reseña",
      })
    }

    // Eliminar la reseña
    await review.destroy()

    res.json({ message: "Reseña eliminada exitosamente" })
  } catch (error) {
    console.error("Error al eliminar reseña:", error)
    res.status(500).json({ message: "Error interno del servidor" })
  }
}
