// Acessar o firebase
const { db, auth } = require('../config/firebase')
const bcrypt = require('bcrypt')

const usersCollection = db.collection('users')

const UserModel = {

    async loginGoogle(googleData) {
        // googleData receberá as informações básicas que o Google nos devolve
        const { email, name, uid } = googleData;

        // 1. Verifica se o usuário já existe (procurando pelo email)
        const snapshot = await usersCollection.where('email', '==', email).get();

        if (!snapshot.empty) {
            // USUÁRIO JÁ EXISTE: Faz o login devolvendo os dados
            const userDoc = snapshot.docs[0];
            const user = { id: userDoc.id, ...userDoc.data() };

            // Se ele foi inativado por um admin, barramos aqui
            if (user.status === 'inactive') {
                throw new Error('Usuário inativo. Entre em contato com o suporte');
            }

            // Remove a senha do retorno (se houver)
            const { password, ...userWithoutPassword } = user;

            // Aqui o frontend vai receber o status atual. 
            // Pode ser 'active' (se ele já completou tudo antes) ou 'incomplete' (se logou e saiu sem completar)
            return userWithoutPassword;
        }

        // 2. USUÁRIO NOVO (Primeiro acesso via Google)

        // Busca o papel padrão 'user'
        const roleSnapshot = await db.collection('roles').where('slug', '==', 'user').get();
        if (roleSnapshot.empty) throw new Error('Papel "user" não existe');

        const defaultRole = roleSnapshot.docs[0];

        // Montamos o objeto APENAS com o que temos e definimos o status aguardando conclusão
        const newUser = {
            name: name,
            email: email,
            level: 'cooper',
            status: 'incompleto', // Indica ao frontend que precisa pedir CPF, telefone, etc.
            roleIds: [defaultRole.id],
            agreeLgpdTerms: false, // Força ele a aceitar na próxima tela
            createdAt: new Date()
            // Não colocamos password, cpf, dateOfBirth, phoneNumber e addressId ainda.
        };

        // Salva no banco usando o UID do Google
        await usersCollection.doc(uid).set(newUser);

        return { id: uid, ...newUser };
    },

    // TESTADO 
    async register(data) {
        // Antes de tudo, garantir que o usuário aceitou os termos LGPD. Isso é fundamental para a conformidade legal e para proteger a privacidade dos usuários. Se o campo 'agreeLgpdTerms' não for verdadeiro, lançamos um erro imediatamente, impedindo o cadastro.
        if (!data.agreeLgpdTerms) throw new Error('É necessário aceitar os termos LGPD')

        // Verificar se email e cpf já existem
        const emailSnapshot = await usersCollection.where('email', '==', data.email).get()
        if (!emailSnapshot.empty) throw new Error('Email já cadastrado')

        const cpfSnapshot = await usersCollection.where('cpf', '==', data.cpf).get()
        if (!cpfSnapshot.empty) throw new Error('CPF já cadastrado')

        // Verificar se o addressId e o role 'user' existem
        if (data.addressId) {
            const addressDoc = await db.collection('address').doc(data.addressId).get()
            if (!addressDoc.exists)
                throw new Error('Endereço não encontrado')
        }

        // Garantir que o papel 'user' exista
        const roleSnapshot = await db.collection('roles').where('slug', '==', 'users').get()
        if (roleSnapshot.empty) throw new Error('Papel "user" não existe')

        const defaultRole = roleSnapshot.docs[0]

        // Como iremos usar o Firebase Auth, precisamos criar o usuário lá
        const firebaseUser = await auth.createUser({
            email: data.email,
            password: data.password,
            displayName: data.name,
        })


        const doc = await usersCollection.doc(firebaseUser.uid).set({
            // Dados pessoais
            name: data.name,
            cpf: data.cpf,
            dateOfBirth: data.dateOfBirth,
            phoneNumber: data.phoneNumber,
            // Há contextos em que o endereço são compartilhados, portanto o addressId é ideal.
            addressId: data.addressId,

            // Dados para autenticação
            email: data.email,

            // Level inicial é 'cooper'
            level: 'cooper',
            agreeLgpdTerms: data.agreeLgpdTerms,
            status: 'active',

            // Cada usuário terá um ou mais papel. 
            // No contexto do cadastro, o registro sempre definirá o papel de 'user'
            roleIds: [defaultRole.id],

            createdAt: new Date()
        })
        // Remove senha do retorno
        const { password, ...dataWithoutPassword } = data
        return { id: firebaseUser.uid, ...dataWithoutPassword, roleIds: [defaultRole.id], status: 'active' }
    },

    // TESTADO
    async update(id, data) {
        const user = await usersCollection.doc(id).get()
        if (!user.exists) throw new Error('Usuário não existe')

        if (data.addressId) {
            const addressDoc = await db.collection('address').doc(data.addressId).get()
            if (!addressDoc.exists)
                throw new Error('Endereço não encontrado')
        }

        if (data.password) {
            data.password = await bcrypt.hash(data.password, 10) // Criptografa se vier no update
        }

        await usersCollection.doc(id).update(data)

        const { password, ...dataWithoutPassword } = data // Remove senha do retorno
        return { id, ...dataWithoutPassword }
    },

    // TESTADO
    async getAll() {
        const snapshot = await usersCollection.get()

        if (snapshot.empty) return null

        return snapshot.docs.map(doc => {
            const { password, cpf, ...data } = doc.data() // Remove cpf e senha do retorno
            return { id: doc.id, ...data, createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : null }
        })
    },

    // Problemas detectados - TODO : Corrigir
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

        // Busca o endereço
        if (user.addressId) {
            const addressDoc = await db.collection('address').doc(String(user.addressId)).get()
            user.address = { id: addressDoc.id, ...addressDoc.data() }
            delete user.addressId
        }

        // Busca os papéis
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

    // TESTADO
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

    // TESTADO
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

    // TESTADO
    async changePassword(id, currentPassword, newPassword) {
        const userDoc = await usersCollection.doc(id).get()
        if (!userDoc.exists) throw new Error('Usuário não encontrado')

        const user = userDoc.data()

        // Verifica se já passou 1 mês desde a última alteração
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

        // Verifica se a senha atual está correta
        const isPasswordValid = await bcrypt.compare(currentPassword, user.password)

        if (!isPasswordValid) {
            throw new Error('Senha atual incorreta')
        }

        // Verifica se a nova senha é diferente da atual
        const isSamePassword = await bcrypt.compare(newPassword, user.password)

        if (isSamePassword) {
            throw new Error('A nova senha deve ser diferente da senha atual')
        }

        // Criptografa e salva a nova senha
        const hashedPassword = await bcrypt.hash(newPassword, 10)

        await usersCollection.doc(id).update({
            password: hashedPassword,
            passwordChangedAt: new Date(),
        })

        return { message: 'Senha alterada com sucesso' }
    },

    // TESTADO
    async updateRoles(adminId, targetUserId, roleIds) {
        // Verifica se o admin existe e tem permissão
        const adminDoc = await usersCollection.doc(adminId).get()

        if (!adminDoc.exists) {
            throw new Error('Administrador não encontrado')
        }

        const admin = adminDoc.data()

        // Busca os papéis do admin e verifica se tem permissão
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

        // Verifica se o usuário alvo existe
        const targetDoc = await usersCollection.doc(String(targetUserId)).get()

        if (!targetDoc.exists) {
            throw new Error('Usuário não encontrado')
        }

        // Verifica se todos os roleIds existem
        for (const roleId of roleIds) {
            const roleDoc = await db.collection('roles').doc(String(roleId)).get()
            if (!roleDoc.exists) {
                throw new Error(`Papel com id '${roleId}' não encontrado`)
            }
        }

        // Garante que o papel 'user' sempre está na lista
        const userRoleSnapshot = await db.collection('roles')
            .where('slug', '==', 'user')
            .get()

        const defaultRoleId = userRoleSnapshot.docs[0].id

        const finalRoleIds = roleIds.includes(defaultRoleId)
            ? roleIds
            : [defaultRoleId, ...roleIds] // ← sempre mantém o papel user

        // Atualiza os papéis
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
}

// TO DO -> Criar função para desativar usuário (status: 'inactive') - Somente admin pode fazer isso. Usuário inativo não pode logar ou acessar o dashboard, mas mantém os dados para histórico e possíveis reativações futuras.

module.exports = UserModel