const express = require('express')
const router = express.Router()
const ComplaintModel = require('../models/complaintModel')
const validate = require('../middlewares/validate')
const authMiddleware = require('../middlewares/auth')
const isGestor = require('../middlewares/isGestor')
const { citizenComplaintSchema, iotComplaintSchema, updateStatusSchema } = require('../validators/complaintValidator')
const { db } = require('../config/firebase')
const complaintsCollection = db.collection('complaints')

// Cidadão cria denúncia
router.post('/citizen', authMiddleware, validate(citizenComplaintSchema), async(request, response) => {
  try {
    const complaint = await ComplaintModel.createFromCitizen({
      ...request.body,
      userId: request.userId, // ← vem do token
    })
    response.status(201).json(complaint)
  } catch (error) {
    response.status(500).json({ error: error.message })
  }
})

// IoT cria denúncia
router.post('/iot', validate(iotComplaintSchema), async(request, response) => {
  try {
    const complaint = await ComplaintModel.createFromIot(request.body)
    response.status(201).json(complaint)
  } catch (error) {
    response.status(500).json({ error: error.message })
  }
})

// Gestor lista todas com filtros opcionais
router.get('/', authMiddleware, isGestor, async(request, response) => {
  try {
    const { source, status, category, neighborhood } = request.query
    const complaints = await ComplaintModel.getAll({ source, status, category, neighborhood })
    response.json(complaints)
  } catch (error) {
    response.status(500).json({ error: error.message })
  }
})

// Cidadão lista as próprias denúncias
router.get('/my', authMiddleware, async(request, response) => {
  try {
    const complaints = await ComplaintModel.getByUserId(request.userId)
    response.json(complaints)
  } catch (error) {
    response.status(500).json({ error: error.message })
  }
})

// Gestor aprova ou rejeita
router.patch('/:id/review', authMiddleware, isGestor, async(request, response) => {
  try {
    const { status, notes } = request.body

    if (!['approved', 'rejected'].includes(status)) {
      return response.status(400).json({ error: 'Status deve ser approved ou rejected' })
    }

    const result = await ComplaintModel.updateStatus(
      request.params.id,
      status,
      request.userId, // ← gestor logado
      notes
    )

    response.json(result)
  } catch (error) {
    response.status(400).json({ error: error.message })
  }
})

// Busca por ID
router.get('/:id', authMiddleware, async(request, response) => {
  try {
    const complaint = await ComplaintModel.getById(request.params.id)
    if (!complaint) return response.status(404).json({ error: 'Denúncia não encontrada' })
    response.json(complaint)
  } catch (error) {
    response.status(500).json({ error: error.message })
  }
})

module.exports = router