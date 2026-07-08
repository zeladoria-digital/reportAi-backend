const Joi = require('joi')

const createFieldTeamSchema = Joi.object({
  name: Joi.string().min(3).max(100).required().messages({
    'string.min': 'Nome deve ter no mínimo 3 caracteres',
    'string.max': 'Nome deve ter no máximo 100 caracteres',
    'any.required': 'Nome é obrigatório',
  }),
  memberIds: Joi.array().items(Joi.string()).required().messages({
    'any.required': 'Membros são obrigatórios',
  }),
})

const updateFieldTeamSchema = Joi.object({
  name: Joi.string().min(3).max(100).optional().messages({
    'string.min': 'Nome deve ter no mínimo 3 caracteres',
    'string.max': 'Nome deve ter no máximo 100 caracteres',
  }),
}).min(1).messages({
  'object.min': 'Informe ao menos um campo para atualizar',
})

const manageMembersSchema = Joi.object({
  memberIds: Joi.array().items(Joi.string()).min(1).required().messages({
    'array.min': 'Informe ao menos um membro',
    'any.required': 'Membros são obrigatórios',
  }),
})

module.exports = { createFieldTeamSchema, updateFieldTeamSchema, manageMembersSchema }