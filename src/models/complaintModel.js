const { db } = require('../config/firebase')

const complaintsCollection = db.collection('complaints')

const ComplaintModel = {
    async create(data){
        const doc = await complaintsCollection.add({
            title: data.title,
            description: data.description,
            userId: data.userId || null,
            photoUrl: data.photoUrl || null,
            category: data.category,
            exif: {
                dateTaken: photoDate.toISOString(),
                // Coordenadas geográficas, se disponíveis
                latitude: data.exif.latitude ?? null,
                longitude: data.exif.longitude ?? null,
            },
            iaReliability: data.iaReliability || null,

            createdAt: new Date(),
        })
        return { id: doc.id, ...data }
    }
}