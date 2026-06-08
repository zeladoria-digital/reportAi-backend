const Joi = require('joi')

const registerUserSchema = Joi.object({
    name: Joi.string().min(3).max(100).required().messages({
        'string.min': 'Nome deve ter no mínimo 3 caracteres',
        'string.max': 'Nome deve ter no máximo 100 caracteres',
        'any.required': 'Nome é obrigatório'
    }),
    cpf: Joi.string().length(14).pattern(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/).required().messages({
        'string.pattern.base': 'CPF inválido. Use o formato 000.000.000-00',
        'string.length': 'CPF deve ter 14 caracteres',
        'any.required': 'CPF é obrigatório'
    }),
    dateOfBirth: Joi.string().isoDate().required().messages({
        'string.isoDate': 'Data de nascimento deve estar no formato AAAA-MM-DD',
        'any.required': 'Data de nascimento é obrigatório'
    }),
    phoneNumber: Joi.string().pattern(/^\(\d{2}\) \d{4,5}-\d{4}$/).required().messages({
        'string.pattern.base': 'Telefone inválido. Use o formato (00) 0000-0000',
        'any.required': 'Telefone é obrigatório'
    }),
    addressId: Joi.string().required().messages({
        'any.required': 'Endereço é obrigatório'
    }),
    email: Joi.string().email().required().messages({
        'string.email': 'E-mail inválido',
        'any.required': 'E-mail é obrigatório'
    }),
    password: Joi.string().min(6).required().messages({
        'string.min': 'Senha deve ter no mínimo 6 caracteres',
        'any.required': 'Senha é obrigatório'
    }),
    agreeLgpdTerms: Joi.boolean().valid(true).required().messages({
        'any.only': 'É necessário aceitar os termos LGPD',
        'any.required': 'Aceite dos termos LGPD é obrigatório',
    }),
})

const updateUserSchema = Joi.object({
    phoneNumber: Joi.string().pattern(/^\(\d{2}\) \d{4,5}-\d{4}$/).optional().messages({
        'string.pattern.base': 'Telefone inválido. Use o formato (00) 0000-0000'
    }),
    addressId: Joi.string().optional().messages({
        
    }),
})

const loginSchema = Joi.object({
    idToken: Joi.string().required().messages({
        'any.required': 'Token do Firebase é obrigatório',
    }),
})

const changePasswordSchema = Joi.object({
    currentPassword: Joi.string().required().messages({
        'any.required': 'Senha atual é obrigatória',
    }),
    newPassword: Joi.string().min(6).required().messages({
        'string.min': 'Nova senha deve ter no mínimo 6 caracteres',
        'any.required': 'Nova senha é obrigatória',
    }),
    confirmNewPassword: Joi.string().valid(Joi.ref('newPassword')).required().messages({
        'any.only': 'Confirmação de senha não confere',
        'any.required': 'Confirmação de senha é obrigatória',
    }),
})

const updateRolesSchema = Joi.object({
  roleIds: Joi.array().items(Joi.string()).min(1).required().messages({
    'array.min': 'Informe ao menos um papel',
    'any.required': 'Papéis são obrigatórios',
  }),
})

module.exports = { registerUserSchema, updateUserSchema, loginSchema, changePasswordSchema, updateRolesSchema }