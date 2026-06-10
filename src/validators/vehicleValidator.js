const Joi = require('joi')

const createVehicleSchema = Joi.object({
  deviceId: Joi.string().required().messages({
    'any.required': 'ID do dispositivo é obrigatório',
  }),
  licensePlate: Joi.string().required().messages({
    'any.required': 'Placa é obrigatória',
  }),
  model: Joi.string().required().messages({
    'any.required': 'Modelo é obrigatório',
  }),
})

const updateVehicleSchema = Joi.object({
  deviceId: Joi.string().optional(),
  licensePlate: Joi.string().optional(),
  model: Joi.string().optional(),
  active: Joi.boolean().optional(),
}).min(1).messages({
  'object.min': 'Informe ao menos um campo para atualizar',
})

module.exports = { createVehicleSchema, updateVehicleSchema }