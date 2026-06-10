const Joi = require('joi')

const createRoleSchema = Joi.object({
  name: Joi.string().min(3).max(50).required().messages({
    'string.min': 'Nome deve ter no mínimo 3 caracteres',
    'string.max': 'Nome deve ter no máximo 50 caracteres',
    'any.required': 'Nome é obrigatório',
  }),
  slug: Joi.string().lowercase().pattern(/^[a-z0-9-]+$/).required().messages({
    'string.pattern.base': 'Slug deve conter apenas letras minúsculas, números e hífens',
    'any.required': 'Slug é obrigatório',
  }),
  permissions: Joi.array().items(Joi.string()).min(1).required().messages({
    'array.min': 'Deve haver ao menos uma permissão',
    'any.required': 'Permissões são obrigatórias',
  }),
})

module.exports = { createRoleSchema }