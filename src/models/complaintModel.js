const { db } = require('../config/firebase')

const complaintsCollection = db.collection('complaints')

const ComplaintModel = {

  // Denúncia do cidadão
  async createFromCitizen(data) {
    if (!data.exif) throw new Error('Metadados da foto são obrigatórios')

    const { dateTaken } = data.exif
    if (!dateTaken) throw new Error('Data de captura da foto é obrigatória')

    const photoDate = new Date(dateTaken)
    const today = new Date()

    const isSameDay =
      photoDate.getDate() === today.getDate() &&
      photoDate.getMonth() === today.getMonth() &&
      photoDate.getFullYear() === today.getFullYear() // ← estava faltando () aqui

    if (!isSameDay) throw new Error('A foto deve ser tirada no momento da denúncia')

    const diffInMinutes = (today - photoDate) / 1000 / 60
    if (diffInMinutes > 60) throw new Error('A foto deve ser tirada no momento da denúncia')

    const doc = await complaintsCollection.add({
      source: 'citizen',           // ← origem
      title: data.title,
      description: data.description,
      userId: data.userId || null,
      photoUrl: data.photoUrl || null,
      category: data.category,
      location: {
        latitude: data.location?.latitude ?? null,
        longitude: data.location?.longitude ?? null,
      },
      exif: {
        dateTaken: photoDate.toISOString(),
        latitude: data.exif.latitude ?? null,
        longitude: data.exif.longitude ?? null,
      },
      iaReliability: data.iaReliability || null,
      status: 'pending',
      createdAt: new Date(),
    })

    return { id: doc.id, ...data, source: 'citizen', status: 'pending' }
  },

  // Denúncia do IoT
  async createFromIot(data) {
    const deviceDoc = await db.collection('iot_devices').doc(data.deviceId).get()
    if (!deviceDoc.exists) throw new Error('Dispositivo não encontrado')

    const doc = await complaintsCollection.add({
      source: 'iot',               // ← origem
      deviceId: data.deviceId,
      category: data.category,
      photoUrl: data.photoUrl || null,
      location: {
        latitude: data.location?.latitude ?? null,
        longitude: data.location?.longitude ?? null,
      },
      iaReliability: data.iaReliability || null,
      status: 'pending',
      createdAt: new Date(),
    })

    return { id: doc.id, ...data, source: 'iot', status: 'pending' }
  },

  // Lista todas — gestor/admin com filtros opcionais
  async getAll(filters = {}) {
    let query = complaintsCollection.orderBy('createdAt', 'desc')

    if (filters.source) query = query.where('source', '==', filters.source)
    if (filters.status) query = query.where('status', '==', filters.status)

    const snapshot = await query.get()
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate().toISOString(),
    }))
  },

  // Lista apenas as do próprio cidadão
  async getByUserId(userId) {
    const snapshot = await complaintsCollection
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get()

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate().toISOString(),
    }))
  },

  async getById(id) {
    const doc = await complaintsCollection.doc(id).get()
    if (!doc.exists) return null
    return {
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate().toISOString(),
    }
  },

  // Atualiza status — gestor/admin
  async updateStatus(id, status) {
    const doc = await complaintsCollection.doc(id).get()
    if (!doc.exists) throw new Error('Denúncia não encontrada')

    await complaintsCollection.doc(id).update({
      status,
      updatedAt: new Date(),
    })

    return { id, status }
  },
}

module.exports = ComplaintModel