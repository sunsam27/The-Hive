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

// vercel.json rewrites "/api/(.*)" to "/api", which discards the captured
// path. If the runtime hands Express the rewritten URL, every route would 404,
// so restore the original path from whichever header the proxy provided.
function restoreOriginalPath(req) {
  if (req.url && req.url !== '/api' && req.url !== '/api/') return;

  const headers = req.headers || {};
  const original = headers['x-vercel-original-path'] || headers['x-forwarded-uri'] || headers['x-original-url'];
  if (typeof original === 'string' && original.startsWith('/api')) {
    req.url = original;
  }
}

module.exports = async (req, res) => {
  try {
    await init();
  } catch (err) {
    console.error('[api] Failed to initialise server:', err);
    res.status(503).json({ error: 'Service unavailable' });
    return;
  }
  restoreOriginalPath(req);
  return app(req, res);
};

module.exports.restoreOriginalPath = restoreOriginalPath;
