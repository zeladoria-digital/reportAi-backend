const { db } = require('../config/firebase')

const rolesCollection = db.collection('roles')

const RoleModel = {
    async create(data){
        const doc = await rolesCollection.add({
            name: data.name,
            slug: data.slug,
            permissions: data.permissions,

            createAt: new Date()
        })
        return { id: doc.id, ...data };
    },
    async getAll(){
        const snapshot = await rolesCollection.get()
        return snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}))
    },
    async getById(id){
        const roleDoc = await rolesCollection.doc(id).get()
        if(!roleDoc) return null

        const role = {id: roleDoc.id, ...roleDoc.data()}

        return role
    },
    async update(id, data){
        const role = await rolesCollection.doc(id).get()
        if(!role.exists) throw new Error('Papel não existe')

        await rolesCollection.doc(id).update(data)
        return {id, ...data}
    },
    async delete(id){
        const role = await rolesCollection.doc(id).get()
        if(!role.exists) throw new Error('Papel não existe')

        await rolesCollection.doc(id).delete()
        return {id}
    }
}

module.exports = RoleModel