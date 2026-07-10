const express = require('express')
const router = express.Router()
const DeviceModel = require('../models/deviceModel')
const validate = require('../middlewares/validate')
const authMiddleware = require('../middlewares/auth')
const isGestor = require('../middlewares/isGestor')
const isAdmin = require('../middlewares/isAdmin')
const { createDeviceSchema, updateDeviceSchema, heartbeatSchema } = require('../validators/deviceValidator')

// Lista todos os dispositivos — gestor e admin
router.get('/', authMiddleware, isGestor, async(request, response) => {
  try {
    const devices = await DeviceModel.getAll()
    response.json(devices)
  } catch (error) {
    response.status(500).json({ error: error.message })
  }
})

// Busca dispositivo por ID — gestor e admin
router.get('/:id', authMiddleware, isGestor, async(request, response) => {
  try {
    const device = await DeviceModel.getById(request.params.id)
    if (!device) return response.status(404).json({ error: 'Dispositivo não encontrado' })
    response.json(device)
  } catch (error) {
    response.status(500).json({ error: error.message })
  }
})

// Registra novo dispositivo — apenas admin
router.post('/', authMiddleware, validate(createDeviceSchema), async(request, response) => {
  try {
    const device = await DeviceModel.create(request.body)
    response.status(201).json(device)
  } catch (error) {
    response.status(500).json({ error: error.message })
  }
})

// Atualiza dispositivo — apenas admin
router.put('/:id', authMiddleware, isAdmin, validate(updateDeviceSchema), async(request, response) => {
  try {
    const device = await DeviceModel.update(request.params.id, request.body)
    response.json(device)
  } catch (error) {
    response.status(400).json({ error: error.message })
  }
})

// Heartbeat — sem autenticação (enviado pelo hardware)
router.post('/:id/heartbeat', validate(heartbeatSchema), async(request, response) => {
  try {
    const result = await DeviceModel.heartbeat(request.params.id, request.body)
    response.status(200).json(result)
  } catch (error) {
    response.status(500).json({ error: error.message })
  }
})

module.exports = router