const { db } = require('../config/firebase')
const AuditLogModel = require('./auditLogModel')
const serviceOrdersCollection = db.collection('service_orders')

const ServiceOrderModel = {
  async create(data) {
    // Verifica se a denúncia existe
    const complaintDoc = await db.collection('complaints').doc(data.complaintId).get()
    if (!complaintDoc.exists) throw new Error('Denúncia não encontrada')

    // Verifica se a denúncia foi aprovada
    const complaint = complaintDoc.data()
    if (complaint.status !== 'approved') {
      throw new Error('Apenas denúncias aprovadas podem gerar ordens de serviço')
    }

    // Verifica se já existe uma ordem para essa denúncia
    const existingOrder = await serviceOrdersCollection
      .where('complaintId', '==', data.complaintId)
      .get()
    if (!existingOrder.empty) {
      throw new Error('Já existe uma ordem de serviço para esta denúncia')
    }

    // Verifica se a equipe existe e está ativa
    const teamDoc = await db.collection('field_teams').doc(data.teamId).get()
    if (!teamDoc.exists) throw new Error('Equipe não encontrada')
    if (teamDoc.data().status !== 'active') throw new Error('Equipe inativa')

    const doc = await serviceOrdersCollection.add({
      complaintId: data.complaintId,
      teamId: data.teamId,
      assignedBy: data.assignedBy,  // ← id do gestor
      status: 'pending',
      notes: data.notes ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
      resolvedAt: null,
    })

    // Atualiza o status da denúncia para 'in_progress'
    await db.collection('complaints').doc(data.complaintId).update({
      status: 'in_progress',
      updatedAt: new Date(),
    })

    return { id: doc.id, ...data, status: 'pending' }
  },

  async getAll(filters = {}) {
    let query = serviceOrdersCollection.orderBy('createdAt', 'desc')

    if (filters.status) query = query.where('status', '==', filters.status)
    if (filters.teamId) query = query.where('teamId', '==', filters.teamId)

    const snapshot = await query.get()
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate().toISOString(),
      updatedAt: doc.data().updatedAt.toDate().toISOString(),
      resolvedAt: doc.data().resolvedAt ? doc.data().resolvedAt.toDate().toISOString() : null,
    }))
  },

  async getById(id) {
    const doc = await serviceOrdersCollection.doc(id).get()
    if (!doc.exists) return null

    const data = doc.data()

    // Busca a denúncia
    const complaintDoc = await db.collection('complaints').doc(data.complaintId).get()
    data.complaint = complaintDoc.exists ? { id: complaintDoc.id, ...complaintDoc.data() } : null
    delete data.complaintId

    // Busca a equipe
    const teamDoc = await db.collection('field_teams').doc(data.teamId).get()
    data.team = teamDoc.exists ? { id: teamDoc.id, ...teamDoc.data() } : null
    delete data.teamId

    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt.toDate().toISOString(),
      updatedAt: data.updatedAt.toDate().toISOString(),
      resolvedAt: data.resolvedAt ? data.resolvedAt.toDate().toISOString() : null,
    }
  },

  // Agente de campo ou gestor atualiza o status
  async updateStatus(id, status, notes = null, updatedBy = null) {
    const doc = await serviceOrdersCollection.doc(id).get()
    if (!doc.exists) throw new Error('Ordem de serviço não encontrada')

    const previousStatus = doc.data().status

    const updateData = {
      status,
      updatedAt: new Date(),
    }

    if (notes) updateData.notes = notes

    if (status === 'completed') {
      updateData.resolvedAt = new Date()
      await db.collection('complaints').doc(doc.data().complaintId).update({
        status: 'resolved',
        updatedAt: new Date(),
      })
    }

    if (status === 'cancelled') {
      await db.collection('complaints').doc(doc.data().complaintId).update({
        status: 'approved',
        updatedAt: new Date(),
      })
    }

    await serviceOrdersCollection.doc(id).update(updateData)

    // Registra o log de auditoria
    if (updatedBy) {
      const userDoc = await db.collection('users').doc(updatedBy).get()
      const userName = userDoc.exists ? userDoc.data().name : 'Desconhecido'

      await AuditLogModel.create({
        userId: updatedBy,
        userName,
        action: 'status_changed',
        entity: 'service_order',
        entityId: id,
        previousValue: previousStatus,
        newValue: status,
        description: `Usuário '${userName}' alterou o status da ordem #${id} de '${previousStatus}' para '${status}'`,
      })
    }

    return { id, status }
  },

  // Agente de campo lista as ordens da sua equipe
  async getByTeamId(teamId) {
    const snapshot = await serviceOrdersCollection
      .where('teamId', '==', teamId)
      .orderBy('createdAt', 'desc')
      .get()

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate().toISOString(),
      updatedAt: doc.data().updatedAt.toDate().toISOString(),
      resolvedAt: doc.data().resolvedAt ? doc.data().resolvedAt.toDate().toISOString() : null,
    }))
  },
}

module.exports = ServiceOrderModel