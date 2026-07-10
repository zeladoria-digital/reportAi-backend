const { db } = require('../config/firebase')
const AuditLogModel = require('./auditLogModel')

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
      neighborhood: data.neighborhood ?? null,
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
      neighborhood: data.neighborhood ?? null,
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
    if (filters.category) query = query.where('category', '==', filters.category)
    if (filters.neighborhood) query = query.where('neighborhood', '==', filters.neighborhood)

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

    async updateStatus(id, status, reviewedBy = null, notes = null) {
      const doc = await complaintsCollection.doc(id).get()
      if (!doc.exists) throw new Error('Denúncia não encontrada')

      const complaint = doc.data()

      if (['resolved', 'cancelled'].includes(complaint.status)) {
        throw new Error('Esta denúncia não pode ser alterada')
      }

      // ← Não permite reverter status já definidos
      if (complaint.status === 'approved') {
        throw new Error('Denúncia já aprovada e não pode ser alterada')
      }

      if (complaint.status === 'rejected') {
        throw new Error('Denúncia já rejeitada e não pode ser alterada')
      }

      if (['resolved', 'cancelled', 'in_progress'].includes(complaint.status)) {
        throw new Error('Esta denúncia não pode ser alterada')
      }

      const previousStatus = complaint.status

      await complaintsCollection.doc(id).update({
        status,
        reviewNotes: notes ?? null,
        reviewedBy: reviewedBy ?? null,
        updatedAt: new Date(),
      })

      // Gamificação
      if (complaint.source === 'citizen' && complaint.userId) {
        const UserModel = require('./userModel')
        if (status === 'approved') await UserModel.updatePoints(complaint.userId, 10)
        if (status === 'resolved') await UserModel.updatePoints(complaint.userId, 50)
      }

      // Registra o log de auditoria
      if (reviewedBy) {
        const userDoc = await db.collection('users').doc(reviewedBy).get()
        const userName = userDoc.exists ? userDoc.data().name : 'Desconhecido'

        await AuditLogModel.create({
          userId: reviewedBy,
          userName,
          action: 'status_changed',
          entity: 'complaint',
          entityId: id,
          previousValue: previousStatus,
          newValue: status,
          description: `Usuário '${userName}' alterou o status da denúncia #${id} de '${previousStatus}' para '${status}'`,
        })
      }

      return { id, status }
    },
}

module.exports = ComplaintModel