const { db } = require('../config/firebase')
const AuditLogModel = require('./auditLogModel')
const serviceOrdersCollection = db.collection('service_orders')

const ServiceOrderModel = {
  async create(data) {
    
    const complaintDoc = await db.collection('complaints').doc(data.complaintId).get()
    if (!complaintDoc.exists) throw new Error('Denúncia não encontrada')

    
    const complaint = complaintDoc.data()
    if (complaint.status !== 'approved') {
      throw new Error('Apenas denúncias aprovadas podem gerar ordens de serviço')
    }

    
    const existingOrder = await serviceOrdersCollection
      .where('complaintId', '==', data.complaintId)
      .get()
    if (!existingOrder.empty) {
      throw new Error('Já existe uma ordem de serviço para esta denúncia')
    }

    
    const teamDoc = await db.collection('field_teams').doc(data.teamId).get()
    if (!teamDoc.exists) throw new Error('Equipe não encontrada')
    if (teamDoc.data().status !== 'active') throw new Error('Equipe inativa')

    const doc = await serviceOrdersCollection.add({
      complaintId: data.complaintId,
      teamId: data.teamId,
      assignedBy: data.assignedBy,  
      status: 'in_progress',
      notes: data.notes ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
      resolvedAt: null,
    })

    
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

    
    const ordersWithDetails = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const data = doc.data()

        
        let complaintDetails = null
        let teamDetails = null

        
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

        
        if (data.teamId) {
          const teamDoc = await db.collection('teams').doc(data.teamId).get()
          if (teamDoc.exists) {
            const tData = teamDoc.data()
            teamDetails = {
              name: tData.name || tData.userName || 'Sem nome'
            }
          }
        }

        
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
          updatedAt: data.updatedAt ? data.updatedAt.toDate().toISOString() : new Date().toISOString(),
          resolvedAt: data.resolvedAt ? data.resolvedAt.toDate().toISOString() : null,
          complaint: complaintDetails, 
          team: teamDetails,           
        }
      })
    )

    return ordersWithDetails
  },

  async getById(id) {
    const doc = await serviceOrdersCollection.doc(id).get()
    if (!doc.exists) return null

    const data = doc.data()

    
    const complaintDoc = await db.collection('complaints').doc(data.complaintId).get()
    data.complaint = complaintDoc.exists ? { id: complaintDoc.id, ...complaintDoc.data() } : null
    delete data.complaintId

    
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

  
  async updateStatus(id, status, notes = null, updatedBy = null) {
    const doc = await serviceOrdersCollection.doc(id).get()
    if (!doc.exists) throw new Error('Ordem de serviço não encontrada')

    const order = doc.data() 
    const previousStatus = order.status

    
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
      
      
      const complaintDoc = await db.collection('complaints').doc(order.complaintId).get()
      const complaint = complaintDoc.data() 

      await db.collection('complaints').doc(order.complaintId).update({
        status: 'resolved',
        updatedAt: new Date(),
      })

      
      if (complaint.source === 'citizen' && complaint.userId) {
        const UserModel = require('./userModel')
        await UserModel.updatePoints(complaint.userId, 50)
      }
    }

    if (status === 'cancelled') {
      await db.collection('complaints').doc(order.complaintId).update({
        status: 'cancelled', 
        updatedAt: new Date(),
      })
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