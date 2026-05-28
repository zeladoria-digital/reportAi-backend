const { db } = require('../config/firebase')

const complaintsCollection = db.collection('complaints')

const ComplaintModel = {
    async create(data){
        // Valida se os metadados EXIF foram enviados
        if (!data.exif) throw new Error('Metadados da foto são obrigatórios')

        const { dateTaken } = data.exif

        if (!dateTaken) throw new Error('Data de captura da foto é obrigatória')

        // Verifica se a foto foi tirada hoje
        const photoDate = new Date(dateTaken)
        const today = new Date()

        const isSameDay = photoDate.getDate() === today.getDate() && photoDate.getMonth() === today.getMonth() && photoDate.getFullYear === today.getFullYear

        if(!isSameDay) throw new Error('A foto deve ser tirada no momento da denúncia')

        const diffInMinutes = (today - photoDate) / 1000 / 60
        if(diffInMinutes > 60) throw new Error('A foto deve ser tirada no momento da denúncia')
        
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