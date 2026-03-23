// Load env first before any other local requires
require('./config/env');

const app = require('./app');
const { PORT } = require('./config/env');
const { runMigrations } = require('./db/migrate');

runMigrations();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
