const Joi = require('joi')

const createDeviceSchema = Joi.object({
  deviceId: Joi.string().required().messages({
    'any.required': 'O ID do dispositivo é obrigatório',
  }),
  vehiclePlate: Joi.string().required().messages({
    'any.required': 'A placa do veículo é obrigatória',
  }),
  status: Joi.string().optional(),
  batteryLevel: Joi.string().optional(),
  aiModelVersion: Joi.string().optional()
}).unknown(true); 

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