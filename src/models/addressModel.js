const { db } = require('../config/firebase')

const addressCollection = db.collection('address')

const AddressModel = {
    async create(data){
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