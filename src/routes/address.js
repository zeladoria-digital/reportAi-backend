const express = require('express')
const router = express.Router()
const AddressModel = require('../models/addressModel')
const validate = require('../middlewares/validate')
const { createAddressSchema } = require('../validators/addressValidator')

router.post('/', validate(createAddressSchema), async(request, response) => {
    try {
        const address = await AddressModel.create(request.body)
        response.status(200).json(address)
    } catch (error) {
        response.status(500).json({ error: error.message })
    }
})

module.exports = router