import 'dotenv/config';
import app from './app.js';
import db from './db/index.js';
import { checkPaymentConfig } from './services/payments/config.js';

const PORT = process.env.PORT || 3001;

async function start() {
  for (const issue of checkPaymentConfig()) {
    const message = `[payments:${issue.provider}] ${issue.message}`;
    if (issue.level === 'error') console.error(message);
    else console.warn(message);
  }

  try {
    await db.migrate.latest({
      directory: './src/db/migrations',
    });
    console.log('Migrations complete');
  } catch (err) {
    console.error('Migration failed:', err);
  }

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start();
