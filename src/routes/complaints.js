const express = require('express')
const router = express.Router()
const multer = require('multer')
const cloudinary = require('cloudinary').v2
const streamifier = require('streamifier')

const ComplaintModel = require('../models/complaintModel')
const validate = require('../middlewares/validate')
const authMiddleware = require('../middlewares/auth')
const isGestor = require('../middlewares/isGestor')
const { citizenComplaintSchema, iotComplaintSchema, updateStatusSchema } = require('../validators/complaintValidator')


const { db } = require('../config/firebase') 


cloudinary.config({
  cloud_name: 'duqyxsmmc', 
  api_key: '522575262639688', 
  api_secret: 'N_F8RyOef4g109zgGX-csBeHepM' 
});

const upload = multer({ storage: multer.memoryStorage() })


const parseFormData = (req, res, next) => {
  if (req.body.dados) {
    try {
      req.body = JSON.parse(req.body.dados);
      req.body.photoUrl = "https://processando.com/foto.jpg"; 
    } catch (e) {
      return res.status(400).json({ error: 'Erro ao ler os dados da denúncia' });
    }
  }
  next();
};


router.post('/citizen', authMiddleware, upload.single('foto'), parseFormData, validate(citizenComplaintSchema), async(request, response) => {
  try {
    let finalPhotoUrl = request.body.photoUrl;

    
    if (request.file) {
      const uploadPromise = new Promise((resolve, reject) => {
        const cld_upload_stream = cloudinary.uploader.upload_stream(
          { folder: "smartzeladoria" },
          (error, result) => {
            if (result) resolve(result.secure_url);
            else reject(error);
          }
        );
        streamifier.createReadStream(request.file.buffer).pipe(cld_upload_stream);
      });

      
      finalPhotoUrl = await uploadPromise; 
    }

    
    const complaint = await ComplaintModel.createFromCitizen({
      ...request.body,
      photoUrl: finalPhotoUrl, 
      userId: request.userId, 
    })
    
    response.status(201).json(complaint)
  } catch (error) {
    console.error("Erro na rota:", error);
    response.status(500).json({ error: error.message })
  }
})


router.post('/iot', validate(iotComplaintSchema), async(request, response) => {
  try {
    const complaint = await ComplaintModel.createFromIot(request.body)
    response.status(201).json(complaint)
  } catch (error) {
    response.status(500).json({ error: error.message })
  }
})


router.get('/', authMiddleware, isGestor, async(request, response) => {
  try {
    const { source, status, category, neighborhood } = request.query
    const complaints = await ComplaintModel.getAll({ source, status, category, neighborhood })
    response.json(complaints)
  } catch (error) {
    response.status(500).json({ error: error.message })
  }
})


router.get('/my', authMiddleware, async(request, response) => {
  try {
    const complaints = await ComplaintModel.getByUserId(request.userId)
    response.json(complaints)
  } catch (error) {
    response.status(500).json({ error: error.message })
  }
})


router.patch('/:id/review', authMiddleware, isGestor, async(request, response) => {
  try {
    const { status, notes } = request.body
    if (!['approved', 'rejected'].includes(status)) {
      return response.status(400).json({ error: 'Status deve ser approved ou rejected' })
    }
    const result = await ComplaintModel.updateStatus(request.params.id, status, request.userId, notes)
    response.json(result)
  } catch (error) {
    response.status(400).json({ error: error.message })
  }
})


router.get('/:id', authMiddleware, async(request, response) => {
  try {
    const complaint = await ComplaintModel.getById(request.params.id)
    if (!complaint) return response.status(404).json({ error: 'Denúncia não encontrada' })
    response.json(complaint)
  } catch (error) {
    response.status(500).json({ error: error.message })
  }
})

module.exports = router