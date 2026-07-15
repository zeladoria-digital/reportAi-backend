const { db } = require('../config/firebase')

const devicesCollection = db.collection('iot_devices')

const DeviceModel = {
async create(data) {
    const doc = await devicesCollection.add({
      deviceId: data.deviceId || null,           
      vehiclePlate: data.vehiclePlate || null,   
      batteryLevel: data.batteryLevel || null,   
      lastHeartbeat: null,
      connectionStatus: 'connected',             
      aiModelVersion: data.aiModelVersion || null,
      currentTemperature: null,
      lastMaintenance: null,
      status: data.status || 'active',           
      failureReason: null,
      lastLocation: null,
      createdAt: new Date(),
    })
    return { id: doc.id, ...data }
  },

  async heartbeat(deviceId, data) {
    const deviceDoc = await devicesCollection.doc(deviceId).get()
    if (!deviceDoc.exists) throw new Error('Dispositivo não encontrado')

    await devicesCollection.doc(deviceId).update({
      lastHeartbeat: new Date(),
      connectionStatus: 'connected',
      currentTemperature: data.currentTemperature ?? null,
      lastLocation: `${data.latitude},${data.longitude}`,
    })

    await db.collection('iot_heartbeats').add({
      deviceId,
      latitude: data.latitude,
      longitude: data.longitude,
      currentTemperature: data.currentTemperature ?? null,
      createdAt: new Date(),
    })

    return { message: 'Heartbeat recebido com sucesso' }
  },

  async checkOfflineDevices() {
    const snapshot = await devicesCollection
      .where('connectionStatus', '==', 'connected')
      .get()

    const tenMinutesAgo = new Date()
    tenMinutesAgo.setMinutes(tenMinutesAgo.getMinutes() - 10)

    for (const doc of snapshot.docs) {
      const device = doc.data()

      if (device.lastHeartbeat && device.lastHeartbeat.toDate() < tenMinutesAgo) {
        await devicesCollection.doc(doc.id).update({
          connectionStatus: 'disconnected',
          failureReason: 'Timeout — sem heartbeat por mais de 10 minutos',
        })
        console.log(`Dispositivo ${doc.id} marcado como desconectado`)
      }
    }
  },

  async getAll() {
    const snapshot = await devicesCollection.get()
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate().toISOString(),
      lastHeartbeat: doc.data().lastHeartbeat
        ? doc.data().lastHeartbeat.toDate().toISOString()
        : null,
    }))
  },

  async getById(id) {
    const doc = await devicesCollection.doc(id).get()
    if (!doc.exists) return null

    return {
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate().toISOString(),
      lastHeartbeat: doc.data().lastHeartbeat
        ? doc.data().lastHeartbeat.toDate().toISOString()
        : null,
    }
  },

  async update(id, data) {
    const doc = await devicesCollection.doc(id).get()
    if (!doc.exists) throw new Error('Dispositivo não encontrado')

    await devicesCollection.doc(id).update({
      ...data,
      updatedAt: new Date(),
    })

    return { id, ...data }
  },
}

module.exports = DeviceModel