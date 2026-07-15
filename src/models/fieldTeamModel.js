const { db } = require('../config/firebase')

const fieldTeamsCollection = db.collection('field_teams')

const FieldTeamModel = {
  async create(data) {
    
    if (data.memberIds && data.memberIds.length > 0) {
      for (const memberId of data.memberIds) {
        const userDoc = await db.collection('users').doc(memberId).get()
        if (!userDoc.exists) throw new Error(`Usuário '${memberId}' não encontrado`)

        const user = userDoc.data()

        
        const roles = await Promise.all(
          user.roleIds.map(async (roleId) => {
            const roleDoc = await db.collection('roles').doc(roleId).get()
            return roleDoc.exists ? roleDoc.data() : null
          })
        )

        const isFieldAgent = roles.some(role => role?.slug === 'field-agent')
        if (!isFieldAgent) throw new Error(`Usuário '${memberId}' não é um agente de campo`)
      }
    }

    const doc = await fieldTeamsCollection.add({
      name: data.name,
      memberIds: data.memberIds ?? [],
      status: 'active',
      createdAt: new Date(),
    })

    return { id: doc.id, ...data, status: 'active', memberIds: data.memberIds ?? [] }
  },

  async getAll() {
    const snapshot = await fieldTeamsCollection
      .where('status', '==', 'active')
      .get()

    return Promise.all(snapshot.docs.map(async doc => {
      const data = doc.data()

      
      if (data.memberIds && data.memberIds.length > 0) {
        const members = await Promise.all(
          data.memberIds.map(async (memberId) => {
            const userDoc = await db.collection('users').doc(memberId).get()
            if (!userDoc.exists) return null
            const { password, ...userData } = userDoc.data()
            return { id: userDoc.id, ...userData }
          })
        )
        data.members = members.filter(m => m !== null)
        delete data.memberIds
      }

      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt.toDate().toISOString(),
      }
    }))
  },

  async getById(id) {
    const doc = await fieldTeamsCollection.doc(id).get()
    if (!doc.exists) return null

    const data = doc.data()

    if (data.memberIds && data.memberIds.length > 0) {
      const members = await Promise.all(
        data.memberIds.map(async (memberId) => {
          const userDoc = await db.collection('users').doc(memberId).get()
          if (!userDoc.exists) return null
          const { password, ...userData } = userDoc.data()
          return { id: userDoc.id, ...userData }
        })
      )
      data.members = members.filter(m => m !== null)
      delete data.memberIds
    }

    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt.toDate().toISOString(),
    }
  },

  async update(id, data) {
    const doc = await fieldTeamsCollection.doc(id).get()
    if (!doc.exists) throw new Error('Equipe não encontrada')

    await fieldTeamsCollection.doc(id).update({
      ...data,
      updatedAt: new Date(),
    })

    return { id, ...data }
  },

  async inactivate(id) {
    const doc = await fieldTeamsCollection.doc(id).get()
    if (!doc.exists) throw new Error('Equipe não encontrada')

    await fieldTeamsCollection.doc(id).update({
      status: 'inactive',
      inactivatedAt: new Date(),
    })

    return { message: 'Equipe inativada com sucesso' }
  },

  
  async addMembers(id, memberIds) {
    const doc = await fieldTeamsCollection.doc(id).get()
    if (!doc.exists) throw new Error('Equipe não encontrada')

    const currentMemberIds = doc.data().memberIds ?? []

    
    for (const memberId of memberIds) {
      const userDoc = await db.collection('users').doc(memberId).get()
      if (!userDoc.exists) throw new Error(`Usuário '${memberId}' não encontrado`)

      const user = userDoc.data()
      const roles = await Promise.all(
        user.roleIds.map(async (roleId) => {
          const roleDoc = await db.collection('roles').doc(roleId).get()
          return roleDoc.exists ? roleDoc.data() : null
        })
      )

      const isFieldAgent = roles.some(role => role?.slug === 'field-agent')
      if (!isFieldAgent) throw new Error(`Usuário '${memberId}' não é um agente de campo`)
    }

    
    const newMemberIds = [...new Set([...currentMemberIds, ...memberIds])]

    await fieldTeamsCollection.doc(id).update({
      memberIds: newMemberIds,
      updatedAt: new Date(),
    })

    return { message: 'Membros adicionados com sucesso', memberIds: newMemberIds }
  },

  
  async removeMembers(id, memberIds) {
    const doc = await fieldTeamsCollection.doc(id).get()
    if (!doc.exists) throw new Error('Equipe não encontrada')

    const currentMemberIds = doc.data().memberIds ?? []
    const newMemberIds = currentMemberIds.filter(m => !memberIds.includes(m))

    await fieldTeamsCollection.doc(id).update({
      memberIds: newMemberIds,
      updatedAt: new Date(),
    })

    return { message: 'Membros removidos com sucesso', memberIds: newMemberIds }
  },
}

module.exports = FieldTeamModel