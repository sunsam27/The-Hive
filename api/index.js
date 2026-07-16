let app;
let migrated = false;

module.exports = async (req, res) => {
  if (!app) {
    const mod = await import('../server/dist/app.js');
    app = mod.default;

    const dbMod = await import('../server/dist/db/index.js');
    const db = dbMod.default;
    try {
      await db.migrate.latest({
        directory: __dirname + '/../server/src/db/migrations',
      });
      console.log('Migrations complete');
    } catch (err) {
      console.error('Migration failed:', err);
    }
    migrated = true;
  }
  return app(req, res);
};
