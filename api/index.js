let app;
let ready;
let initStage = 'start';

async function init() {
  if (!ready) {
    ready = (async () => {
      initStage = 'import-db';
      const { default: db } = await import('../server/dist/db/index.js');

      initStage = 'migrate';
      await db.migrate.latest();

      initStage = 'import-app';
      const { default: expressApp } = await import('../server/dist/app.js');
      app = expressApp;

      initStage = 'ready';
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
    console.error(`[api] Failed to initialise server (stage: ${initStage}):`, err);
    // Drop the cached rejected promise so the next request retries instead of
    // this warm function instance serving 503 for its whole lifetime.
    ready = undefined;
    // `stage` names which init step failed so the 503 is diagnosable without
    // exposing error text. Full detail stays in the function logs.
    res.status(503).json({ error: 'Service unavailable', stage: initStage });
    return;
  }
  restoreOriginalPath(req);
  return app(req, res);
};

module.exports.restoreOriginalPath = restoreOriginalPath;
