let app;
let ready;

async function init() {
  if (!ready) {
    ready = (async () => {
      const { default: db } = await import('../server/dist/db/index.js');
      await db.migrate.latest();

      const { default: expressApp } = await import('../server/dist/app.js');
      app = expressApp;
    })();
  }
  return ready;
}

module.exports = async (req, res) => {
  try {
    await init();
  } catch (err) {
    console.error('[api] Failed to initialise server:', err);
    res.status(503).json({ error: 'Service unavailable' });
    return;
  }
  return app(req, res);
};
