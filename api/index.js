let app;

module.exports = async (req, res) => {
  if (!app) {
    const mod = await import('../server/dist/app.js');
    app = mod.default;
  }
  return app(req, res);
};
