require('dotenv').config({ path: '../../.env' })
const { db } = require('../config/firebase')
const bcrypt = require('bcrypt')

async function seed() {
  console.log('🌱 Iniciando seed...')

  // Criando papéis
  console.log('Criando papéis...')
  const roles = [
    {
      name: 'Usuário',
      slug: 'user',
      permissions: ['create_request', 'view_own_requests'],
      createdAt: new Date(),
    },
    {
      name: 'Gestor',
      slug: 'gestor',
      permissions: ['view_reports', 'manage_tasks', 'view_dashboard'],
      createdAt: new Date(),
    },
    {
      name: 'Administrador',
      slug: 'admin',
      permissions: ['manage_roles', 'manage_users', 'manage_tasks', 'view_dashboard'],
      createdAt: new Date(),
    },
  ]

  const roleIds = {}
  for (const role of roles) {
    const doc = await db.collection('roles').add(role)
    roleIds[role.slug] = doc.id
    console.log(`✅ Papel '${role.name}' criado: ${doc.id}`)
  }

  // Criando endereços
  console.log('Criando endereços...')
  const addressDoc = await db.collection('address').add({
    cep: '59380-000',
    city: 'Currais Novos',
    neighborhood: 'Centro',
    road: 'Rua Cel. Martiniano',
    houseNumber: '245',
    createdAt: new Date(),
  })
  console.log(`✅ Endereço criado: ${addressDoc.id}`)

  // Criando usuários
  console.log('Criando usuários...')
  const users = [
    {
      name: 'Admin Silva',
      cpf: '111.111.111-11',
      dateOfBirth: '1990-01-01',
      phoneNumber: '(84) 99999-0001',
      email: 'admin@email.com',
      password: await bcrypt.hash('admin123', 10),
      roleIds: [roleIds['admin']],
      addressId: addressDoc.id,
      agreeLgpdTerms: true,
      status: 'active',
      createdAt: new Date(),
    },
    {
      name: 'Gestor Souza',
      cpf: '222.222.222-22',
      dateOfBirth: '1992-05-15',
      phoneNumber: '(84) 99999-0002',
      email: 'gestor@email.com',
      password: await bcrypt.hash('gestor123', 10),
      roleIds: [roleIds['gestor']],
      addressId: addressDoc.id,
      agreeLgpdTerms: true,
      status: 'active',
      createdAt: new Date(),
    },
    {
      name: 'João Usuário',
      cpf: '333.333.333-33',
      dateOfBirth: '1995-08-20',
      phoneNumber: '(84) 99999-0003',
      email: 'joao@email.com',
      password: await bcrypt.hash('user123', 10),
      roleIds: [roleIds['user']],
      addressId: addressDoc.id,
      agreeLgpdTerms: true,
      status: 'active',
      createdAt: new Date(),
    },
  ]

  for (const user of users) {
    const doc = await db.collection('users').add(user)
    console.log(`✅ Usuário '${user.name}' criado: ${doc.id}`)
  }

  console.log('✅ Seed concluído com sucesso!')
  process.exit(0)
}

seed().catch((error) => {
  console.error('❌ Erro no seed:', error)
  process.exit(1)
})