require('dotenv').config()
const express = require('express')
const app = express();
const PORT = 3000;

// Middleware para JSON
app.use(express.json());

const rolesRoute = require('./src/routes/roles')
const usersRoute = require('./src/routes/users')
const addressRoute = require('./src/routes/address')

app.use('/roles', rolesRoute)
app.use('/users', usersRoute)
app.use('/address', addressRoute)

// Rota de exemplo
app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});