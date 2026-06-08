const express = require('express')
const router = express.Router()
const ComplaintModel = require('../models/complaintModel')
const validate = require('../middlewares/validate')
const authMiddleware = require('../middlewares/auth')
const isGestor = require('../middlewares/isGestor')
const { citizenComplaintSchema, iotComplaintSchema, updateStatusSchema } = require('../validators/complaintValidator')

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
    const { source, status } = request.query // ex: ?source=iot&status=pending
    const complaints = await ComplaintModel.getAll({ source, status })
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

// Gestor atualiza status
router.patch('/:id/status', authMiddleware, isGestor, validate(updateStatusSchema), async(request, response) => {
  try {
    const result = await ComplaintModel.updateStatus(request.params.id, request.body.status)
    response.json(result)
  } catch (error) {
    response.status(500).json({ error: error.message })
  }
})

module.exports = router