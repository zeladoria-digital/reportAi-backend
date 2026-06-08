const { db } = require('../config/firebase')

const vehiclesCollection = db.collection('vehicles')

const VehicleModel = {
  async create(data) {
    const doc = await vehiclesCollection.add({
      deviceId: data.deviceId,
      licensePlate: data.licensePlate,
      model: data.model,
      active: true,
      createdAt: new Date(),
    })
    return { id: doc.id, ...data }
  },

  async getAll() {
    const snapshot = await vehiclesCollection.get()
    return Promise.all(snapshot.docs.map(async doc => {
      const data = doc.data()

      if (data.deviceId) {
        const deviceDoc = await db.collection('iot_devices').doc(data.deviceId).get()
        data.device = deviceDoc.exists ? { id: deviceDoc.id, ...deviceDoc.data() } : null
        delete data.deviceId
      }

      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt.toDate().toISOString(),
      }
    }))
  },

  async getById(id) {
    const doc = await vehiclesCollection.doc(id).get()
    if (!doc.exists) return null

    const data = doc.data()

    if (data.deviceId) {
      const deviceDoc = await db.collection('iot_devices').doc(data.deviceId).get()
      data.device = deviceDoc.exists ? { id: deviceDoc.id, ...deviceDoc.data() } : null
      delete data.deviceId
    }

    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt.toDate().toISOString(),
    }
  },

  async update(id, data) {
    const doc = await vehiclesCollection.doc(id).get()
    if (!doc.exists) throw new Error('Veículo não encontrado')

    await vehiclesCollection.doc(id).update({
      ...data,
      updatedAt: new Date(),
    })

    return { id, ...data }
  },

  async inactivate(id) {
    const doc = await vehiclesCollection.doc(id).get()
    if (!doc.exists) throw new Error('Veículo não encontrado')

    await vehiclesCollection.doc(id).update({
      active: false,
      inactivatedAt: new Date(),
    })

    return { message: 'Veículo inativado com sucesso' }
  },
}

module.exports = VehicleModel