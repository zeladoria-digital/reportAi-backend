const express = require('express')
const router = express.Router()
const RoleModel = require('../models/roleModel')
const validate = require('../middlewares/validate')
const { createRoleSchema } = require('../validators/roleValidator')

router.get('/', async(request, response) => {
    try {
        const role = await RoleModel.getAll()
        response.json(role)
    } catch (error) {
        response.status(500).json({ error: error.message }) 
    }
})

router.get('/:id', async(request, response) => {
    try {
        const roles = await RoleModel.getById(request.params.id)
        response.json(roles)
    } catch (error) {
        response.status(500).json({ erros: error.message })
    }
})

router.post('/', validate(createRoleSchema), async(request, response) => {
    try {
        const role = await RoleModel.create(request.body)
        response.status(200).json(role)
    } catch (error) {
        response.status(500).json({ error: error.message })
    }
})

module.exports = router