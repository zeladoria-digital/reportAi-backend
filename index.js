require('dotenv').config()
const express = require('express')
const app = express();
const PORT = 3000;

// Middleware para JSON
app.use(express.json());

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

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});