const { db } = require('../config/firebase')

async function isGestor(request, response, next) {
  try {
    const roleIds = request.userRoleIds

    if (!roleIds || roleIds.length === 0) {
      return response.status(403).json({ error: 'Acesso negado' })
    }

    // Busca os papéis do usuário logado
    const roles = await Promise.all(
      roleIds.map(async (roleId) => {
        const roleDoc = await db.collection('roles').doc(String(roleId)).get()
        return roleDoc.exists ? roleDoc.data() : null
      })
    )

    // Gestor e admin têm acesso
    const hasAccess = roles.some(role =>
      ['gestor', 'admin', 'superadmin'].includes(role?.slug)
    )

    if (!hasAccess) {
      return response.status(403).json({ error: 'Acesso negado. Apenas gestores podem realizar esta ação' })
    }

    next()
  } catch (error) {
    response.status(500).json({ error: error.message })
  }
}

module.exports = isGestor