const Joi = require('joi')

const createAddressSchema = Joi.object({
  cep: Joi.string().length(9).required().messages({
    'string.length': 'CEP deve ter 9 caracteres (formato: 00000-000)',
    'any.required': 'CEP é obrigatório',
  }),

  city: Joi.string().min(3).max(100).required().messages({
    'string.min': 'Cidade deve ter no mínimo 3 caracteres',
    'string.max': 'Cidade deve ter no máximo 100 caracteres',
    'any.required': 'Cidade é obrigatória',
  }),

  neighborhood: Joi.string().min(3).max(100).required().messages({
    'string.min': 'Bairro deve ter no mínimo 3 caracteres',
    'string.max': 'Bairro deve ter no máximo 100 caracteres',
    'any.required': 'Bairro é obrigatório',
  }),

  road: Joi.string().min(3).max(150).required().messages({
    'string.min': 'Rua deve ter no mínimo 3 caracteres',
    'string.max': 'Rua deve ter no máximo 150 caracteres',
    'any.required': 'Rua é obrigatória',
  }),

  houseNumber: Joi.string().max(10).required().messages({
    'string.max': 'Número deve ter no máximo 10 caracteres',
    'any.required': 'Número é obrigatório',
  }),
})

module.exports = { createAddressSchema }