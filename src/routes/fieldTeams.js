const express = require('express')
const router = express.Router()
const FieldTeamModel = require('../models/fieldTeamModel')
const validate = require('../middlewares/validate')
const authMiddleware = require('../middlewares/auth')
const isGestor = require('../middlewares/isGestor')
const isAdmin = require('../middlewares/isAdmin')
const { createFieldTeamSchema, updateFieldTeamSchema, manageMembersSchema } = require('../validators/fieldTeamValidator')

// Lista todas as equipes — gestor e admin
router.get('/', authMiddleware, isGestor, isAdmin, async(request, response) => {
  try {
    const teams = await FieldTeamModel.getAll()
    response.json(teams)
  } catch (error) {
    response.status(500).json({ error: error.message })
  }
})

// Busca equipe por ID — gestor e admin
router.get('/:id', authMiddleware, isGestor, isAdmin, async(request, response) => {
  try {
    const team = await FieldTeamModel.getById(request.params.id)
    if (!team) return response.status(404).json({ error: 'Equipe não encontrada' })
    response.json(team)
  } catch (error) {
    response.status(500).json({ error: error.message })
  }
})

// Cria equipe — apenas admin
router.post('/', authMiddleware, isAdmin, validate(createFieldTeamSchema), async(request, response) => {
  try {
    const team = await FieldTeamModel.create(request.body)
    response.status(201).json(team)
  } catch (error) {
    response.status(500).json({ error: error.message })
  }
})

// Atualiza equipe — apenas admin
router.put('/:id', authMiddleware, isAdmin, validate(updateFieldTeamSchema), async(request, response) => {
  try {
    const team = await FieldTeamModel.update(request.params.id, request.body)
    response.json(team)
  } catch (error) {
    response.status(400).json({ error: error.message })
  }
})

// Adiciona membros — apenas admin
router.patch('/:id/members/add', authMiddleware, isAdmin, validate(manageMembersSchema), async(request, response) => {
  try {
    const result = await FieldTeamModel.addMembers(request.params.id, request.body.memberIds)
    response.json(result)
  } catch (error) {
    response.status(400).json({ error: error.message })
  }
})

// Remove membros — apenas admin
router.patch('/:id/members/remove', authMiddleware, isAdmin, validate(manageMembersSchema), async(request, response) => {
  try {
    const result = await FieldTeamModel.removeMembers(request.params.id, request.body.memberIds)
    response.json(result)
  } catch (error) {
    response.status(400).json({ error: error.message })
  }
})

// Inativa equipe — apenas admin
router.patch('/:id/inactivate', authMiddleware, isAdmin, async(request, response) => {
  try {
    const result = await FieldTeamModel.inactivate(request.params.id)
    response.json(result)
  } catch (error) {
    response.status(400).json({ error: error.message })
  }
})

module.exports = router