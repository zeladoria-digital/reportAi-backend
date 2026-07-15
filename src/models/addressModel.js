const { db } = require('../config/firebase')

const addressCollection = db.collection('address')

const AddressModel = {
    async create(data){
        
        const existing = await addressCollection
            .where('cep', '==', data.cep)
            .where('houseNumber', '==', data.houseNumber)
            .where('road', '==', data.road)
            .get()

        if (!existing.empty) {
            const doc = existing.docs[0]
            return { id: doc.id, ...doc.data() } 
        }
        
        const doc = await addressCollection.add({
            cep: data.cep,
            city: data.city,
            neighborhood: data.neighborhood,
            road: data.road,
            houseNumber: data.houseNumber,

            createdAt: new Date()
        })
        return { id: doc.id, ...data };
    }
}

module.exports = AddressModel