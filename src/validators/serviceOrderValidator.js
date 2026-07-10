const Joi = require('joi')

const createServiceOrderSchema = Joi.object({
  complaintId: Joi.string().required().messages({
    'any.required': 'ID da denúncia é obrigatório',
  }),
  teamId: Joi.string().required().messages({
    'any.required': 'ID da equipe é obrigatório',
  }),
  notes: Joi.string().max(500).optional().messages({
    'string.max': 'Observações devem ter no máximo 500 caracteres',
  }),
  // ← sem status aqui, sempre começa como in_progress
})

const updateStatusSchema = Joi.object({
  status: Joi.string().valid('completed', 'cancelled').required().messages({
    'any.only': 'Status deve ser completed ou cancelled',
    'any.required': 'Status é obrigatório',
  }),
  notes: Joi.string().max(500).optional().messages({
    'string.max': 'Observações devem ter no máximo 500 caracteres',
  }),
})

module.exports = { createServiceOrderSchema, updateStatusSchema }