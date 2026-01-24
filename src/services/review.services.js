import { Review } from "../models/Review.js"
import { User } from "../models/User.js"
import { Airline } from "../models/Airline.js"

// ============================================================
// CREAR NUEVA RESEÑA
// ============================================================
export const createReview = async (req, res) => {
  try {
    const { airline, rating, comment } = req.body
    const userId = req.user.id

    console.log('📝 Creando reseña:', { userId, airline, rating })

    // ========== VALIDACIONES ==========
    
    // 1. Validar campos obligatorios
    if (!airline) {
      return res.status(400).json({ 
        message: "La aerolínea es obligatoria" 
      })
    }

    if (!rating) {
      return res.status(400).json({ 
        message: "La calificación es obligatoria" 
      })
    }

    if (!comment || !comment.trim()) {
      return res.status(400).json({ 
        message: "El comentario es obligatorio" 
      })
    }

    // 2. Validar rating
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ 
        message: "La calificación debe estar entre 1 y 5" 
      })
    }

    // 3. Verificar que la aerolínea exista
    const airlineExists = await Airline.findOne({
      where: { name: airline }
    })

    if (!airlineExists) {
      return res.status(404).json({ 
        message: "Aerolínea no encontrada" 
      })
    }

    // 4. Verificar que el usuario no haya reseñado ya esta aerolínea
    const existingReview = await Review.findOne({
      where: { userId, airline }
    })

    if (existingReview) {
      return res.status(409).json({
        message: "Ya has reseñado esta aerolínea"
      })
    }

    // ========== CREAR RESEÑA ==========
    const review = await Review.create({
      userId,
      airline,
      rating,
      comment: comment.trim(),
    })

    console.log('✅ Reseña creada:', review.id)

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
    console.error("❌ Error al crear reseña:", error)
    res.status(500).json({ 
      message: "Error interno del servidor",
      error: error.message 
    })
  }
}

// ============================================================
// OBTENER TODAS LAS RESEÑAS
// ============================================================
export const getAllReviews = async (req, res) => {
  try {
    const reviews = await Review.findAll({
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "profilePicture"],
        },
      ],
      order: [["createdAt", "DESC"]],
    })

    console.log(`📋 ${reviews.length} reseñas encontradas`)
    res.json(reviews)
  } catch (error) {
    console.error("❌ Error al obtener reseñas:", error)
    res.status(500).json({ 
      message: "Error interno del servidor",
      error: error.message 
    })
  }
}

// ============================================================
// OBTENER RESEÑAS POR AEROLÍNEA
// ============================================================
export const getReviewsByAirline = async (req, res) => {
  try {
    const { airline } = req.params

    if (!airline) {
      return res.status(400).json({ 
        message: "Debe proporcionar el nombre de la aerolínea" 
      })
    }

    const reviews = await Review.findAll({
      where: { airline },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "profilePicture"],
        },
      ],
      order: [["createdAt", "DESC"]],
    })

    console.log(`📋 ${reviews.length} reseñas de ${airline}`)
    res.json(reviews)
  } catch (error) {
    console.error("❌ Error al obtener reseñas por aerolínea:", error)
    res.status(500).json({ 
      message: "Error interno del servidor",
      error: error.message 
    })
  }
}

// ============================================================
// OBTENER CALIFICACIÓN PROMEDIO DE AEROLÍNEA
// ============================================================
export const getAirlineAverageRating = async (req, res) => {
  try {
    const { airline } = req.params

    if (!airline) {
      return res.status(400).json({ 
        message: "Debe proporcionar el nombre de la aerolínea" 
      })
    }

    const result = await Review.findAll({
      where: { airline },
      attributes: [
        [Review.sequelize.fn("AVG", Review.sequelize.col("rating")), "averageRating"],
        [Review.sequelize.fn("COUNT", Review.sequelize.col("id")), "totalReviews"],
      ],
      raw: true,
    })

    const averageRating = result[0]?.averageRating 
      ? Number.parseFloat(result[0].averageRating).toFixed(1) 
      : 0
    const totalReviews = result[0]?.totalReviews || 0

    console.log(`⭐ ${airline}: ${averageRating} (${totalReviews} reseñas)`)

    res.json({
      airline,
      averageRating: Number.parseFloat(averageRating),
      totalReviews: Number.parseInt(totalReviews),
    })
  } catch (error) {
    console.error("❌ Error al calcular promedio:", error)
    res.status(500).json({ 
      message: "Error interno del servidor",
      error: error.message 
    })
  }
}

// ============================================================
// ACTUALIZAR RESEÑA
// ============================================================
export const updateReview = async (req, res) => {
  try {
    const { id } = req.params
    const { rating, comment } = req.body
    const userId = req.user.id

    console.log('📝 Actualizando reseña:', { id, userId, rating })

    // Validaciones
    if (!rating) {
      return res.status(400).json({ 
        message: "La calificación es obligatoria" 
      })
    }

    if (!comment || !comment.trim()) {
      return res.status(400).json({ 
        message: "El comentario es obligatorio" 
      })
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ 
        message: "La calificación debe estar entre 1 y 5" 
      })
    }

    // Buscar la reseña
    const review = await Review.findByPk(id)
    if (!review) {
      return res.status(404).json({ message: "Reseña no encontrada" })
    }

    // Verificar que el usuario sea el propietario
    if (review.userId !== userId) {
      return res.status(403).json({
        message: "No tienes permiso para editar esta reseña",
      })
    }

    // Actualizar la reseña
    await review.update({ 
      rating, 
      comment: comment.trim() 
    })

    console.log('✅ Reseña actualizada:', id)

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
    console.error("❌ Error al actualizar reseña:", error)
    res.status(500).json({ 
      message: "Error interno del servidor",
      error: error.message 
    })
  }
}

// ============================================================
// ELIMINAR RESEÑA
// ============================================================
export const deleteReview = async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.id

    console.log('🗑️  Eliminando reseña:', { id, userId })

    // Buscar la reseña
    const review = await Review.findByPk(id)
    if (!review) {
      return res.status(404).json({ message: "Reseña no encontrada" })
    }

    // Verificar que el usuario sea el propietario
    if (review.userId !== userId) {
      return res.status(403).json({
        message: "No tienes permiso para eliminar esta reseña",
      })
    }

    // Guardar info para el log
    const airlineName = review.airline

    // Eliminar la reseña
    await review.destroy()

    console.log(`✅ Reseña de ${airlineName} eliminada`)

    res.json({ message: "Reseña eliminada exitosamente" })
  } catch (error) {
    console.error("❌ Error al eliminar reseña:", error)
    res.status(500).json({ 
      message: "Error interno del servidor",
      error: error.message 
    })
  }
}