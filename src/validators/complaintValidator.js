const Joi = require('joi')

// 👇 Criamos uma lista com as categorias exatas do seu aplicativo
const categoriasPermitidas = [
  'Fossa cheia', 
  'Vazamento', 
  'Buraco na via', 
  'Iluminação', 
  'Lixo acumulado', 
  'Árvore caída', 
  'Perigo', 
  'Outro'
];

const citizenComplaintSchema = Joi.object({
  category: Joi.string().valid(
    'Fossa cheia', 'Vazamento', 'Buraco na via', 'Iluminação', 
    'Lixo acumulado', 'Árvore caída', 'Perigo', 'Outro'
  ).required().messages({
    'any.only': 'Categoria inválida',
    'any.required': 'Categoria é obrigatória',
  }),
  // ... resto do código
  description: Joi.string().min(10).max(500).optional().allow('').messages({
    'string.min': 'Descrição deve ter no mínimo 10 caracteres',
  }),
  photoUrl: Joi.string().uri().required().messages({
    'string.uri': 'URL da foto inválida',
    'any.required': 'URL da foto é obrigatória',
  }),
  location: Joi.object({
    latitude: Joi.number().required(),
    longitude: Joi.number().required(),
  }).required(),
  exif: Joi.object({
    dateTaken: Joi.string().isoDate().required().messages({
      'any.required': 'Data de captura da foto é obrigatória',
    }),
    latitude: Joi.number().optional(),
    longitude: Joi.number().optional(),
  }).required(),
  neighborhood: Joi.string().min(3).max(100).optional().allow(''),
  tags: Joi.array().items(Joi.string()).optional().default([]),
  // ← sem status aqui, sempre começa como pending
})

const iotComplaintSchema = Joi.object({
  deviceId: Joi.string().required().messages({
    'any.required': 'ID do dispositivo é obrigatório',
  }),
  category: Joi.string().valid(...categoriasPermitidas).required().messages({
    'any.only': 'Categoria inválida',
    'any.required': 'Categoria é obrigatória',
  }),
  photoUrl: Joi.string().uri().required().messages({
    'string.uri': 'URL da foto inválida',
    'any.required': 'URL da foto é obrigatória',
  }),
  location: Joi.object({
    latitude: Joi.number().required(),
    longitude: Joi.number().required(),
  }).required(),
  neighborhood: Joi.string().min(3).max(100).optional()
})

const updateStatusSchema = Joi.object({
  status: Joi.string().valid('approved', 'rejected').required().messages({
    'any.only': 'Status deve ser approved ou rejected',
    'any.required': 'Status é obrigatório',
  }),
  notes: Joi.string().max(500).optional().messages({
    'string.max': 'Observações devem ter no máximo 500 caracteres',
  }),
})

module.exports = { citizenComplaintSchema, iotComplaintSchema, updateStatusSchema }