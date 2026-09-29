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

// Postgres and Node network failures already carry a short, unambiguous code
// (28P01, 3D000, ECONNREFUSED, ENOTFOUND, ...). Surfacing the code alone makes the
// 503 self-diagnosing from a plain browser request, without ever putting the
// connection string, password, or error message in the response.
const INIT_ERROR_HINTS = {
  ENOTFOUND: 'hostname does not resolve - wrong database host or project',
  EAI_AGAIN: 'DNS lookup failed - check the hostname',
  ECONNREFUSED: 'connection refused - wrong port, or the database is refusing Vercel IPs',
  ETIMEDOUT: 'connection timed out - firewall or IP allowlist is blocking Vercel',
  EHOSTUNREACH: 'host unreachable - network or IP allowlist problem',
  ECONNRESET: 'connection reset during the handshake',
  '28P01': 'password authentication failed - password is wrong or was reset',
  '3D000': 'the database named in the URL does not exist',
  '28000': 'authentication method rejected - check the database role',
  '42501': 'permission denied for this role - check grants',
  '42P01': 'relation does not exist - migrations have not run',
  '57P03': 'cannot connect now - database is paused or starting up',
  53300: 'too many connections - pool exhausted',
  '3F000': 'the schema named in the URL does not exist',
};

// Knex wraps driver errors, so walk the cause chain for the first real code.
function initErrorCode(err) {
  let current = err;
  for (let depth = 0; current && depth < 6; depth += 1) {
    const code = current.code;
    if (typeof code === 'string' && /^[A-Za-z0-9_]{1,20}$/.test(code)) {
      return code.toUpperCase();
    }
    current = current.cause;
  }
  return 'UNKNOWN';
}

module.exports = async (req, res) => {
  try {
    await init();
  } catch (err) {
    console.error(`[api] Failed to initialise server (stage: ${initStage}):`, err);
    // Drop the cached rejected promise so the next request retries instead of
    // this warm function instance serving 503 for its whole lifetime.
    ready = undefined;
    // `stage` and `code` are enough to diagnose this from a browser. Error text
    // stays in the function logs so credentials never reach the response.
    const code = initErrorCode(err);
    res.status(503).json({
      error: 'Service unavailable',
      stage: initStage,
      code,
      ...(INIT_ERROR_HINTS[code] ? { hint: INIT_ERROR_HINTS[code] } : {}),
    });
    return;
  }
  restoreOriginalPath(req);
  return app(req, res);
};

module.exports.restoreOriginalPath = restoreOriginalPath;
