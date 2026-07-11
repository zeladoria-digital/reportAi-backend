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
      status: 'in_progress',
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

    return { id: doc.id, ...data, status: 'in_progress' }
  },

  async getAll(filters = {}) {
    let query = serviceOrdersCollection.orderBy('createdAt', 'desc')

    if (filters.status) query = query.where('status', '==', filters.status)
    if (filters.teamId) query = query.where('teamId', '==', filters.teamId)

    const snapshot = await query.get()

    // Mapeia os documentos e busca as relações em paralelo
    const ordersWithDetails = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const data = doc.data()

        // 1. Inicializa os objetos de relacionamento como nulos (caso não existam)
        let complaintDetails = null
        let teamDetails = null

        // 2. Busca os dados da Ocorrência relacionada
        if (data.complaintId) {
          const complaintDoc = await db.collection('complaints').doc(data.complaintId).get()
          if (complaintDoc.exists) {
            const cData = complaintDoc.data()
            complaintDetails = {
              category: cData.category,
              neighborhood: cData.neighborhood || 'Não informado',
              source: cData.source
            }
          }
        }

        // 3. Busca os dados da Equipe relacionada (ajuste 'teams' se sua coleção tiver outro nome, ex: 'users')
        if (data.teamId) {
          const teamDoc = await db.collection('teams').doc(data.teamId).get()
          if (teamDoc.exists) {
            const tData = teamDoc.data()
            teamDetails = {
              name: tData.name || tData.userName || 'Sem nome'
            }
          }
        }

        // 4. Retorna a ordem de serviço montada iguaizinha ao que o Front-end espera
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
          updatedAt: data.updatedAt ? data.updatedAt.toDate().toISOString() : new Date().toISOString(),
          resolvedAt: data.resolvedAt ? data.resolvedAt.toDate().toISOString() : null,
          complaint: complaintDetails, // Injeta o objeto mapeado
          team: teamDetails,           // Injeta o objeto mapeado
        }
      })
    )

    return ordersWithDetails
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

    const order = doc.data() // ← adicione essa linha
    const previousStatus = order.status

    // Não permite alterar ordens já finalizadas
    if (order.status === 'completed') {
      throw new Error('Ordem já concluída e não pode ser alterada')
    }

    if (order.status === 'cancelled') {
      throw new Error('Ordem já cancelada e não pode ser alterada')
    }

    if (!['completed', 'cancelled'].includes(status)) {
      throw new Error('Status deve ser completed ou cancelled')
    }

    const updateData = {
      status,
      updatedAt: new Date(),
    }

    if (notes) updateData.notes = notes

    if (status === 'completed') {
      updateData.resolvedAt = new Date()
      await db.collection('complaints').doc(order.complaintId).update({
        status: 'resolved', // ← correto
        updatedAt: new Date(),
      })
    }

    if (status === 'cancelled') {
      await db.collection('complaints').doc(order.complaintId).update({
        status: 'cancelled', // ← era 'approved', corrigi para 'cancelled'
        updatedAt: new Date(),
      })
    }

    // Gamificação
    if (complaint.source === 'citizen' && complaint.userId) {
      const UserModel = require('./userModel')
      // A única possibilidade de status que dá pontos é completed (ordem concluída)
      if (status === 'completed') await UserModel.updatePoints(complaint.userId, 50)
    }

    await serviceOrdersCollection.doc(id).update(updateData)

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