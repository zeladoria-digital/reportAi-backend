const { db } = require('../config/firebase')

async function isGestor(request, response, next) {
  try {
    const roleIds = request.userRoleIds

    if (!roleIds || roleIds.length === 0) {
      return response.status(403).json({ error: 'Acesso negado' })
    }

    
    const roles = await Promise.all(
      roleIds.map(async (roleId) => {
        const roleDoc = await db.collection('roles').doc(roleId.trim()).get()
        return roleDoc.exists ? roleDoc.data() : null
      })
    )

    
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