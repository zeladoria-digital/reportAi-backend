const { db } = require('../config/firebase')

const auditLogsCollection = db.collection('audit_logs')

const AuditLogModel = {
  async create(data) {
    const doc = await auditLogsCollection.add({
      userId: data.userId,           // quem executou a ação
      userName: data.userName,       // nome para facilitar leitura
      action: data.action,           // ex: 'status_changed'
      entity: data.entity,           // ex: 'complaint', 'service_order'
      entityId: data.entityId,       // ID do documento alterado
      previousValue: data.previousValue ?? null, // valor anterior
      newValue: data.newValue ?? null,           // novo valor
      description: data.description, // ex: "Alterou status do buraco #102 para Resolvido"
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