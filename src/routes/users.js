const express = require('express')
const router = express.Router()
const UserModel = require('../models/userModel')
const validate = require('../middlewares/validate')
const jwt = require('jsonwebtoken')
const { registerUserSchema, updateUserSchema, loginSchema, changePasswordSchema, updateRolesSchema } = require('../validators/userValidator')
const authMiddleware = require('../middlewares/auth')
const isGestor = require('../middlewares/isGestor')
const { db } = require('../config/firebase')

router.get('/', authMiddleware, isGestor,  async(request, response) => {
    try {
        const user = await UserModel.getAll()
        response.json(user)
    } catch (error) {
        response.status(500).json({ error: error.message })
    }
})

router.post('/login', validate(loginSchema), async(request, response) => {
  try {
    const { idToken } = request.body

    // Verifica o idToken do Firebase
    const decodedToken = await auth.verifyIdToken(idToken)
    const uid = decodedToken.uid

    // Busca o usuário no Firestore
    const userDoc = await usersCollection.doc(uid).get()
    if (!userDoc.exists) throw new Error('Usuário não encontrado')

    const { password, ...userData } = userDoc.data()
    const user = { id: uid, ...userData }

    if (user.status !== 'active') throw new Error('Usuário inativo')

    // Gera o JWT próprio
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        level: user.level,
        roleIds: user.roleIds,
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    )

    response.status(200).json({ user, token })
  } catch (error) {
    response.status(401).json({ error: error.message })
  }
})

router.post('/login-dashboard', validate(loginSchema), async(request, response) => {
  try {
    const { idToken } = request.body

    // Verifica o idToken do Firebase
    const decodedToken = await auth.verifyIdToken(idToken)
    const uid = decodedToken.uid

    // Busca o usuário no Firestore
    const userDoc = await usersCollection.doc(uid).get()
    if (!userDoc.exists) throw new Error('Usuário não encontrado')

    const { password, ...userData } = userDoc.data()
    const user = { id: uid, ...userData }

    if (user.status !== 'active') throw new Error('Usuário inativo')

    // Verifica se tem papel de gestor/admin
    const roles = await Promise.all(
      user.roleIds.map(async (roleId) => {
        const roleDoc = await db.collection('roles').doc(roleId).get()
        return roleDoc.exists ? roleDoc.data() : null
      })
    )

    const allowedSlugs = ['gestor', 'admin', 'superadmin']
    const hasDashboardAccess = roles.some(role => allowedSlugs.includes(role?.slug))

    if (!hasDashboardAccess) {
      throw new Error('Acesso negado. Você não tem permissão para acessar o dashboard')
    }

    // Gera o JWT próprio
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        level: user.level,
        roleIds: user.roleIds,
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    )

    response.status(200).json({ user, token })
  } catch (error) {
    response.status(401).json({ error: error.message })
  }
})

router.post('/register', validate(registerUserSchema), async(request, response) => {
    try {
        const users = await UserModel.register(request.body)
        response.status(200).json(users)
    } catch (error) {
        response.status(500).json({ error: error.message })
    }
})

router.get('/:id', authMiddleware, async(request, response) => {
    try {
      const userRoleIds = request.userRoleIds || []
      // Busca os papéis do usuário logado
      const roles = await Promise.all(
        request.userRoleIds.map(async (roleId) => {
          const roleDoc = await db.collection('roles').doc(roleId).get()
          return roleDoc.exists ? roleDoc.data() : null
        })
      )

      const isAdminOrGestor = roles.some(role =>
        ['gestor', 'admin', 'superadmin'].includes(role?.slug)
      )

      // Admin/gestor pode ver qualquer usuário, o resto só o próprio
      if (!isAdminOrGestor && request.userId !== request.params.id) {
        return response.status(403).json({ error: 'Você não tem permissão para visualizar este usuário' })
      }

      const user = await UserModel.getById(request.params.id)

      if (!user) {
        return response.status(404).json({ error: 'Usuário não encontrado' })
      }

      response.json(user)
    } catch (error) {
        response.status(500).json({ error: error.message })
    }
})

// Mudar dados mais flexíveis - Usuário mudando dados de perfil
router.patch('/:id', authMiddleware, validate(updateUserSchema), async(request, response) => {
    try {
      // Verifica se é o próprio usuário ou um admin
      if (request.userId !== request.params.id)
        return response.status(403).json({ error: 'Você não tem permissão para atualizar este usuário' })

        const result = await UserModel.update(request.params.id, request.body)

        response.status(200).json(result)
    } catch (error) {
        response.status(400).json({ error: error.message })
    }
})

router.put('/:id/change-password', authMiddleware, validate(changePasswordSchema), async(request, response) => {
    try {
        if (request.userId !== request.params.id)
          return response.status(403).json({ error: 'Você não tem permissão para atualizar a senha deste usuário' })

        const { currentPassword, newPassword } = request.body
        const result = await UserModel.changePassword(request.params.id, currentPassword, newPassword)

        response.status(200).json(result)
    } catch (error) {
        response.status(400).json({ error: error.message })
    }
})

router.patch('/:id/roles', authMiddleware, isGestor, validate(updateRolesSchema), async(request, response) => {
  try {
    const { roleIds } = request.body

    const result = await UserModel.updateRoles(
      request.userId, // Id do admin/gestor que está fazendo a alteração
      request.params.id,
      roleIds
    )

    response.status(200).json(result)
  } catch (error) {
    response.status(403).json({ error: error.message })
  }
})

module.exports = router