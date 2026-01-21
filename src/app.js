const express = require('express');
const bodyParser = require('body-parser');
const authRoutes = require('./modules/auth/auth.routes');
const requestRoutes = require('./requests/request.routes');
const errorHandler = require('./middleware/error.middleware');

const app = express();
app.use(bodyParser.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/requests', requestRoutes);

app.use(errorHandler);

module.exports = app;
