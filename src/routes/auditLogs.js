const express = require('express')
const router = express.Router()
const AuditLogModel = require('../models/auditLogModel')
const authMiddleware = require('../middlewares/auth')
const isGestor = require('../middlewares/isGestor')

// Lista logs — apenas gestor e admin
router.get('/', authMiddleware, isGestor, async(request, response) => {
  try {
    const { userId, entity, entityId } = request.query
    const logs = await AuditLogModel.getAll({ userId, entity, entityId })
    response.json(logs)
  } catch (error) {
    response.status(500).json({ error: error.message })
  }
})

module.exports = router