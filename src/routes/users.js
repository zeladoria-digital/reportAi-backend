const express = require('express')
const router = express.Router()
const UserModel = require('../models/userModel')
const validate = require('../middlewares/validate')
const jwt = require('jsonwebtoken')
const { registerUserSchema, updateUserSchema, loginSchema, changePasswordSchema, updateRolesSchema } = require('../validators/userValidator')
const authMiddleware = require('../middlewares/auth')
const isGestor = require('../middlewares/isGestor')
const { db, auth } = require('../config/firebase')

router.get('/', authMiddleware, isGestor, async (request, response) => {
  try {
    const user = await UserModel.getAll()
    response.json(user)
  } catch (error) {
    response.status(500).json({ error: error.message })
  }
})

router.post('/login-google', async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ error: 'O token do Google é obrigatório.' });
    }

    // CORREÇÃO 1: Usando o 'auth' importado do seu config/firebase
    const decodedToken = await auth.verifyIdToken(idToken);

    const dadosSegurosDoGoogle = {
      uid: decodedToken.uid,
      name: decodedToken.name,
      email: decodedToken.email
    };

    // Passa os dados para o model fazer o controle de usuário
    const user = await UserModel.loginGoogle(dadosSegurosDoGoogle);

    // CORREÇÃO 2: Gerando o JWT para manter o padrão das outras rotas de login
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        level: user.level,
        roleIds: user.roleIds,
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    // Retorna o usuário e o token
    return res.status(200).json({ user, token });

  } catch (error) {
    console.error('Erro na validação do Firebase:', error);
    return res.status(401).json({ error: 'Token do Google inválido ou expirado.' });
  }
});

// Login mobile
router.post('/login', validate(loginSchema), async (request, response) => {
  try {
    const { idToken } = request.body

    const decodedToken = await auth.verifyIdToken(idToken)
    const uid = decodedToken.uid

    // ← troque usersCollection por db.collection('users')
    const userDoc = await db.collection('users').doc(uid).get()
    if (!userDoc.exists) throw new Error('Usuário não encontrado')

    const { password, ...userData } = userDoc.data()
    const user = { id: uid, ...userData }

    if (user.status !== 'active') throw new Error('Usuário inativo')

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

// Login dashboard
router.post('/login-dashboard', validate(loginSchema), async (request, response) => {
  try {
    const { idToken } = request.body

    const decodedToken = await auth.verifyIdToken(idToken)
    const uid = decodedToken.uid

    // ← troque usersCollection por db.collection('users')
    const userDoc = await db.collection('users').doc(uid).get()
    if (!userDoc.exists) throw new Error('Usuário não encontrado')

    const { password, ...userData } = userDoc.data()
    const user = { id: uid, ...userData }

    if (user.status !== 'active') throw new Error('Usuário inativo')

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

router.post('/register', validate(registerUserSchema), async (request, response) => {
  try {
    const users = await UserModel.register(request.body)
    response.status(200).json(users)
  } catch (error) {
    console.error('Erro no registro:', error)
    response.status(500).json({ error: error.message })
  }
})

router.get('/ranking', async(request, response) => {
  try {
    const ranking = await UserModel.getRanking()
    response.json(ranking)
  } catch (error) {
    response.status(500).json({ error: error.message })
  }
})

router.get('/:id/points', authMiddleware, async(request, response) => {
  try {
    // Apenas o próprio usuário ou gestor/admin pode ver
    const userRoleIds = request.userRoleIds || []
    const roles = await Promise.all(
      userRoleIds.map(async (roleId) => {
        const roleDoc = await db.collection('roles').doc(roleId.trim()).get()
        return roleDoc.exists ? roleDoc.data() : null
      })
    )

    const isAdminOrGestor = roles.some(role =>
      ['gestor', 'admin', 'superadmin'].includes(role?.slug)
    )

    if (!isAdminOrGestor && request.userId !== request.params.id) {
      return response.status(403).json({ error: 'Você não tem permissão para ver a pontuação deste usuário' })
    }

    const user = await UserModel.getById(request.params.id)
    if (!user) return response.status(404).json({ error: 'Usuário não encontrado' })

    response.json({
      userId: user.id,
      name: user.name,
      points: user.points ?? 0,
      level: user.level ?? 'bronze',
    })
  } catch (error) {
    response.status(500).json({ error: error.message })
  }
})

router.get('/:id', authMiddleware, async (request, response) => {
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
router.patch('/:id', authMiddleware, validate(updateUserSchema), async (request, response) => {
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

router.put('/:id/change-password', authMiddleware, validate(changePasswordSchema), async (request, response) => {
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

router.patch('/:id/roles', authMiddleware, isGestor, validate(updateRolesSchema), async (request, response) => {
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