require('dotenv').config()

const express = require('express')
const cors = require('cors')

const app = express()
const PORT = 3000

app.use(cors({
  origin: [
    'http://localhost:8081',  // ← Expo web (mobile)
    'http://localhost:5173',  // ← Vite (dashboard web)
    'http://10.0.0.18:8081', // ← Expo no celular
  ],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'], // ISSO AQUI É O OURO!
}))

app.use(express.json())

const rolesRoute = require('./src/routes/roles')
const usersRoute = require('./src/routes/users')
const addressRoute = require('./src/routes/address')
const complaintsRoute = require('./src/routes/complaints')
const devicesRoute = require('./src/routes/devices')
const vehiclesRoute = require('./src/routes/vehicles')
const fieldTeamsRoute = require('./src/routes/fieldTeams')
const serviceOrdersRoute = require('./src/routes/serviceOrders')
const auditLogsRoute = require('./src/routes/auditLogs')

app.use('/roles', rolesRoute)
app.use('/users', usersRoute)
app.use('/address', addressRoute)
app.use('/complaints', complaintsRoute)
app.use('/devices', devicesRoute)
app.use('/vehicles', vehiclesRoute)
app.use('/field-teams', fieldTeamsRoute)
app.use('/service-orders', serviceOrdersRoute)
app.use('/audit-logs', auditLogsRoute)

// Rota de exemplo
app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});