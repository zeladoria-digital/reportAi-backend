const express = require('express')
const router = express.Router()
const ServiceOrderModel = require('../models/serviceOrderModel')
const validate = require('../middlewares/validate')
const authMiddleware = require('../middlewares/auth')
const isGestor = require('../middlewares/isGestor')
const { createServiceOrderSchema, updateStatusSchema } = require('../validators/serviceOrderValidator')

// Lista todas as ordens — gestor e admin
router.get('/', authMiddleware, isGestor, async(request, response) => {
  try {
    const { status, teamId } = request.query
    const orders = await ServiceOrderModel.getAll({ status, teamId })
    response.json(orders)
  } catch (error) {
    response.status(500).json({ error: error.message })
  }
})

// Lista ordens da própria equipe — agente de campo
router.get('/my-team/:teamId', authMiddleware, async(request, response) => {
  try {
    const orders = await ServiceOrderModel.getByTeamId(request.params.teamId)
    response.json(orders)
  } catch (error) {
    response.status(500).json({ error: error.message })
  }
})

// Busca ordem por ID — gestor, admin e agente de campo
router.get('/:id', authMiddleware, async(request, response) => {
  try {
    const order = await ServiceOrderModel.getById(request.params.id)
    if (!order) return response.status(404).json({ error: 'Ordem de serviço não encontrada' })
    response.json(order)
  } catch (error) {
    response.status(500).json({ error: error.message })
  }
})

// Cria ordem de serviço — apenas gestor e admin
router.post('/', authMiddleware, isGestor, validate(createServiceOrderSchema), async(request, response) => {
  try {
    const order = await ServiceOrderModel.create({
      ...request.body,
      assignedBy: request.userId, // ← id do gestor logado
    })
    response.status(201).json(order)
  } catch (error) {
    response.status(500).json({ error: error.message })
  }
})

// Atualiza status — gestor, admin e agente de campo
router.patch('/:id/status', authMiddleware, validate(updateStatusSchema), async(request, response) => {
  try {
    const { status, notes } = request.body
    const result = await ServiceOrderModel.updateStatus(request.params.id, status, notes)
    response.json(result)
  } catch (error) {
    response.status(400).json({ error: error.message })
  }
})

module.exports = router