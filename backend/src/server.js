const app = require('./app');
const config = require('./config/env');

const PORT = config.PORT || 8000;

app.listen(PORT, () => {
  console.log(`[Express Backend] Server running on ${config.BACKEND_URL} (Port ${PORT})`);
});
