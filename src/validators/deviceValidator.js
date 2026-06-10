const Joi = require('joi')

const createDeviceSchema = Joi.object({
  aiModelVersion: Joi.string().required().messages({
    'any.required': 'Versão do modelo IA é obrigatória',
  }),
})

const updateDeviceSchema = Joi.object({
  aiModelVersion: Joi.string().optional(),
  status: Joi.string().valid('active', 'inactive', 'maintenance').optional().messages({
    'any.only': 'Status deve ser active, inactive ou maintenance',
  }),
  lastMaintenance: Joi.string().isoDate().optional().messages({
    'string.isoDate': 'Data de manutenção deve estar no formato YYYY-MM-DD',
  }),
    failureReason: Joi.string().optional(),
    }).min(1).messages({
    'object.min': 'Informe ao menos um campo para atualizar',
    })

const heartbeatSchema = Joi.object({
  latitude: Joi.number().required().messages({
    'any.required': 'Latitude é obrigatória',
  }),
  longitude: Joi.number().required().messages({
    'any.required': 'Longitude é obrigatória',
  }),
  currentTemperature: Joi.number().optional(),
})

module.exports = { createDeviceSchema, updateDeviceSchema, heartbeatSchema }