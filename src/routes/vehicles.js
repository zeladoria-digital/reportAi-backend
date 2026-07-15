const express = require('express')
const router = express.Router()
const VehicleModel = require('../models/vehicleModel')
const validate = require('../middlewares/validate')
const authMiddleware = require('../middlewares/auth')
const isGestor = require('../middlewares/isGestor')
const isAdmin = require('../middlewares/isAdmin')
const { createVehicleSchema, updateVehicleSchema } = require('../validators/vehicleValidator')


router.get('/', authMiddleware, isGestor, async(request, response) => {
  try {
    const vehicles = await VehicleModel.getAll()
    response.json(vehicles)
  } catch (error) {
    response.status(500).json({ error: error.message })
  }
})


router.get('/:id', authMiddleware, isGestor, async(request, response) => {
  try {
    const vehicle = await VehicleModel.getById(request.params.id)
    if (!vehicle) return response.status(404).json({ error: 'Veículo não encontrado' })
    response.json(vehicle)
  } catch (error) {
    response.status(500).json({ error: error.message })
  }
})


router.post('/', authMiddleware, isAdmin, validate(createVehicleSchema), async(request, response) => {
  try {
    const vehicle = await VehicleModel.create(request.body)
    response.status(201).json(vehicle)
  } catch (error) {
    response.status(500).json({ error: error.message })
  }
})


router.put('/:id', authMiddleware, isAdmin, validate(updateVehicleSchema), async(request, response) => {
  try {
    const vehicle = await VehicleModel.update(request.params.id, request.body)
    response.json(vehicle)
  } catch (error) {
    response.status(400).json({ error: error.message })
  }
})


router.patch('/:id/inactivate', authMiddleware, isAdmin, async(request, response) => {
  try {
    const result = await VehicleModel.inactivate(request.params.id)
    response.json(result)
  } catch (error) {
    response.status(400).json({ error: error.message })
  }
})

module.exports = router