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
  // 👇 Injetamos a nossa lista aqui
  category: Joi.string().valid(...categoriasPermitidas).required().messages({
    'any.only': 'Categoria inválida. Deve ser uma das categorias do app.',
    'any.required': 'Categoria é obrigatória',
  }),
  description: Joi.string().min(10).max(500).required().messages({
    'string.min': 'Descrição deve ter no mínimo 10 caracteres',
    'any.required': 'Descrição é obrigatória',
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
  neighborhood: Joi.string().min(3).max(100).required().messages({
    'string.min': 'Bairro deve ter no mínimo 3 caracteres',
    'any.required': 'Bairro é obrigatório',
  }),
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
  status: Joi.string().valid('pending', 'reviewing', 'resolved', 'rejected').required().messages({
    'any.only': 'Status inválido',
    'any.required': 'Status é obrigatório',
  }),
})

module.exports = { citizenComplaintSchema, iotComplaintSchema, updateStatusSchema }