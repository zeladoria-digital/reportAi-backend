const { db } = require('../config/firebase')

const auditLogsCollection = db.collection('audit_logs')

const AuditLogModel = {
  async create(data) {
    const doc = await auditLogsCollection.add({
      userId: data.userId,           
      userName: data.userName,       
      action: data.action,           
      entity: data.entity,           
      entityId: data.entityId,       
      previousValue: data.previousValue ?? null, 
      newValue: data.newValue ?? null,           
      description: data.description, 
      createdAt: new Date(),
    })
    return { id: doc.id, ...data }
  },

  async getAll(filters = {}) {
    let query = auditLogsCollection.orderBy('createdAt', 'desc')

    if (filters.userId) query = query.where('userId', '==', filters.userId)
    if (filters.entity) query = query.where('entity', '==', filters.entity)
    if (filters.entityId) query = query.where('entityId', '==', filters.entityId)

    const snapshot = await query.get()
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate().toISOString(),
    }))
  },
}

module.exports = AuditLogModel