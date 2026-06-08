const jwt = require('jsonwebtoken')

function authMiddleware(request, response, next) {
  const authHeader = request.headers.authorization

  if (!authHeader) {
    return response.status(401).json({ error: 'Token não fornecido' })
  }

  const [, token] = authHeader.split(' ')

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    request.userId = decoded.id
    request.userLevel = decoded.level
    request.userRoleIds = decoded.roleIds
    next()
  } catch (error) {
    return response.status(401).json({ error: 'Token inválido ou expirado' })
  }
}

module.exports = authMiddleware