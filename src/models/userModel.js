
const { db, auth } = require('../config/firebase')
const bcrypt = require('bcrypt')

const usersCollection = db.collection('users')

const UserModel = {
    
    async register(data) {
        
        if (!data.agreeLgpdTerms) throw new Error('É necessário aceitar os termos LGPD')

        
        const emailSnapshot = await usersCollection.where('email', '==', data.email).get()
        if (!emailSnapshot.empty) throw new Error('Email já cadastrado')

        const cpfSnapshot = await usersCollection.where('cpf', '==', data.cpf).get()
        if (!cpfSnapshot.empty) throw new Error('CPF já cadastrado')

        
        if (data.addressId) {
            const addressDoc = await db.collection('address').doc(data.addressId).get()
            if (!addressDoc.exists)
                throw new Error('Endereço não encontrado')
        }

        
        const roleSnapshot = await db.collection('roles').where('slug', '==', 'user').get()
        if (roleSnapshot.empty) throw new Error('Papel "user" não existe')

        const defaultRole = roleSnapshot.docs[0]

        
        const firebaseUser = await auth.createUser({
            email: data.email,
            password: data.password,
            displayName: data.name,
        })


        const doc = await usersCollection.doc(firebaseUser.uid).set({
            
            name: data.name,
            cpf: data.cpf,
            dateOfBirth: data.dateOfBirth,
            phoneNumber: data.phoneNumber,
            
            addressId: data.addressId,

            
            email: data.email,

            
            level: 'cooper',
            points: 0,
            
            agreeLgpdTerms: data.agreeLgpdTerms,
            status: 'active',

            
            
            roleIds: [defaultRole.id],
            

            createdAt: new Date()
        })
        
        const { password, ...dataWithoutPassword } = data
        return { id: firebaseUser.uid, ...dataWithoutPassword, roleIds: [defaultRole.id], status: 'active' }
    },

    
    async update(id, data) {
        const user = await usersCollection.doc(id).get()
        if (!user.exists) throw new Error('Usuário não existe')

        if (data.addressId) {
            const addressDoc = await db.collection('address').doc(data.addressId).get()
            if (!addressDoc.exists)
                throw new Error('Endereço não encontrado')
        }

        if (data.password) {
            data.password = await bcrypt.hash(data.password, 10) 
        }

        await usersCollection.doc(id).update(data)

        const { password, ...dataWithoutPassword } = data 
        return { id, ...dataWithoutPassword }
    },

    
    async getAll() {
        const snapshot = await usersCollection.get()

        if (snapshot.empty) return null

        return snapshot.docs.map(doc => {
            const { password, cpf, ...data } = doc.data() 
            return { id: doc.id, ...data, createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : null }
        })
    },

    
    async getById(id) {
        const userDoc = await usersCollection.doc(id).get()
        if (!userDoc.exists) return null

        const { password, ...data } = userDoc.data()

        console.log('data completo:', JSON.stringify(data))
        const user = {
            id: userDoc.id,
            ...data,
            createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : null
        }

        
        if (user.addressId) {
            const addressDoc = await db.collection('address').doc(String(user.addressId)).get()
            user.address = { id: addressDoc.id, ...addressDoc.data() }
            delete user.addressId
        }

        
        if (user.roleIds && user.roleIds.length > 0) {
            const roles = await Promise.all(
                user.roleIds.map(async (roleId) => {
                    const roleDoc = await db.collection('roles').doc(String(roleId)).get()
                    return roleDoc.exists ? { id: roleDoc.id, ...roleDoc.data() } : null
                })
            )
            user.roles = roles.filter(role => role !== null)
            delete user.roleIds
        } else {
            user.roles = []
        }

        return user
    },

    
    async login(email, password) {
        const snapshot = await usersCollection
            .where('email', '==', email)
            .get()

        if (snapshot.empty) throw new Error('E-mail ou senha inválidos')

        const userDoc = snapshot.docs[0]
        const user = { id: userDoc.id, ...userDoc.data() }

        const isPasswordValid = await bcrypt.compare(password, user.password)
        if (!isPasswordValid) throw new Error('E-mail ou senha inválidos')

        if (user.status !== 'active') throw new Error('Usuário inativo. Entre em contato com o suporte')

        const { password: _, ...userWithoutPassword } = user

        return userWithoutPassword
    },

    
    async loginDashboard(email, password) {
        const snapshot = await usersCollection
            .where('email', '==', email)
            .get()

        if (snapshot.empty) throw new Error('E-mail ou senha inválidos')

        const userDoc = snapshot.docs[0]
        const user = { id: userDoc.id, ...userDoc.data() }

        const isPasswordValid = await bcrypt.compare(password, user.password)
        if (!isPasswordValid) throw new Error('E-mail ou senha inválidos')

        if (user.status !== 'active') throw new Error('Usuário inativo. Entre em contato com o suporte')

        if (!user.roleIds || user.roleIds.length === 0)
            throw new Error('Acesso negado. Você não tem permissão para acessar o dashboard')

        const roles = await Promise.all(
            user.roleIds.map(async (roleId) => {
                const roleDoc = await db.collection('roles').doc(roleId).get()
                return roleDoc.exists ? { id: roleDoc.id, ...roleDoc.data() } : null
            })
        )

        const allowedSlugs = ['gestor', 'admin', 'superadmin']
        const hasDashboardAccess = roles.some(role => allowedSlugs.includes(role?.slug))

        if (!hasDashboardAccess) throw new Error('Acesso negado. Você não tem permissão para acessar o dashboard')

        const { password: _, ...userWithoutPassword } = user
        return { ...userWithoutPassword, roles }
    },

    
    async changePassword(id, currentPassword, newPassword) {
        const userDoc = await usersCollection.doc(id).get()
        if (!userDoc.exists) throw new Error('Usuário não encontrado')

        const user = userDoc.data()

        
        if (user.passwordChangedAt) {
            const lastChange = user.passwordChangedAt.toDate()
            const oneMonthAgo = new Date()
            oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)

            if (lastChange > oneMonthAgo) {
                const nextAllowedDate = new Date(lastChange)
                nextAllowedDate.setMonth(nextAllowedDate.getMonth() + 1)

                throw new Error(
                    `Senha só pode ser alterada após ${nextAllowedDate.toLocaleDateString('pt-BR')}`
                )
            }
        }

        
        const isPasswordValid = await bcrypt.compare(currentPassword, user.password)

        if (!isPasswordValid) {
            throw new Error('Senha atual incorreta')
        }

        
        const isSamePassword = await bcrypt.compare(newPassword, user.password)

        if (isSamePassword) {
            throw new Error('A nova senha deve ser diferente da senha atual')
        }

        
        const hashedPassword = await bcrypt.hash(newPassword, 10)

        await usersCollection.doc(id).update({
            password: hashedPassword,
            passwordChangedAt: new Date(),
        })

        return { message: 'Senha alterada com sucesso' }
    },

    
    async updateRoles(adminId, targetUserId, roleIds) {
        
        const adminDoc = await usersCollection.doc(adminId).get()

        if (!adminDoc.exists) {
            throw new Error('Administrador não encontrado')
        }

        const admin = adminDoc.data()

        
        if (!admin.roleIds || admin.roleIds.length === 0)
            throw new Error('Você não tem permissão para gerenciar papéis')

        const adminRoles = await Promise.all(
            admin.roleIds.map(async (roleId) => {
                const roleDoc = await db.collection('roles').doc(roleId).get()
                return roleDoc.exists ? roleDoc.data() : null
            })
        )

        const hasPermission = adminRoles.some(role =>
            role?.permissions?.includes('manage_roles')
        )

        if (!hasPermission) {
            throw new Error('Você não tem permissão para gerenciar papéis')
        }

        
        const targetDoc = await usersCollection.doc(String(targetUserId)).get()

        if (!targetDoc.exists) {
            throw new Error('Usuário não encontrado')
        }

        
        for (const roleId of roleIds) {
            const roleDoc = await db.collection('roles').doc(String(roleId)).get()
            if (!roleDoc.exists) {
                throw new Error(`Papel com id '${roleId}' não encontrado`)
            }
        }

        
        const userRoleSnapshot = await db.collection('roles')
            .where('slug', '==', 'user')
            .get()

        const defaultRoleId = userRoleSnapshot.docs[0].id

        const finalRoleIds = roleIds.includes(defaultRoleId)
            ? roleIds
            : [defaultRoleId, ...roleIds] 

        
        await usersCollection.doc(String(targetUserId)).update({
            roleIds: finalRoleIds,
            rolesUpdatedAt: new Date(),
            rolesUpdatedBy: adminId,
        })

        return {
            message: 'Papéis atualizados com sucesso',
            userId: targetUserId,
            roleIds: finalRoleIds,
        }
    },
    async loginGoogle(googleData) {
        
        const { email, name, uid } = googleData;

        
        const snapshot = await usersCollection.where('email', '==', email).get();

        if (!snapshot.empty) {
            
            const userDoc = snapshot.docs[0];
            const user = { id: userDoc.id, ...userDoc.data() };

            
            if (user.status === 'inactive') {
                throw new Error('Usuário inativo. Entre em contato com o suporte');
            }

            
            const { password, ...userWithoutPassword } = user;

            
            
            return userWithoutPassword;
        }

        

        
        const roleSnapshot = await db.collection('roles').where('slug', '==', 'user').get();
        if (roleSnapshot.empty) throw new Error('Papel "user" não existe');

        const defaultRole = roleSnapshot.docs[0];

        
        const newUser = {
            name: name,
            email: email,
            level: 'cooper',
            provider: 'google', 
            status: 'incomplete', 
            roleIds: [defaultRole.id],
            agreeLgpdTerms: false, 
            createdAt: new Date()
            
        };

        
        await usersCollection.doc(uid).set(newUser);

        return { id: uid, ...newUser };
    },

    async updatePoints(userId, pointsToAdd) {
        const userDoc = await usersCollection.doc(userId).get()
        if (!userDoc.exists) throw new Error('Usuário não encontrado')

        const user = userDoc.data()
        const currentPoints = user.points ?? 0
        const newPoints = currentPoints + pointsToAdd

        
        let level
        if (newPoints >= 500) {
            level = 'gold'
        } else if (newPoints >= 100) {
            level = 'silver'
        } else {
            level = 'cooper'
        }

        await usersCollection.doc(userId).update({
            points: newPoints,
            level,
            updatedAt: new Date(),
        })

        return { userId, points: newPoints, level }
        },


    async getRanking() {
        const snapshot = await usersCollection
            .orderBy('points', 'desc')
            .limit(10) 
            .get()

        return snapshot.docs.map((doc, index) => {
            const { password, cpf, ...data } = doc.data()
            return {
            position: index + 1,
            id: doc.id,
            name: data.name,
            points: data.points ?? 0,
            level: data.level ?? 'cooper',
            }
        })
    },
}

module.exports = UserModel