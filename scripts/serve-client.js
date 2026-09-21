const path = require('node:path');
const fs = require('node:fs');
module.exports = function serveClient(app, express) {
  const root = path.join(__dirname, '..', 'public');
  app.use('/dist', (req, res, next) => {
    if (!['GET','HEAD'].includes(req.method) || !/^\/play\.[a-f0-9]{12}\.(js|css)$/.test(req.path)) return next();
    const file = path.join(root, 'dist', path.basename(req.path));
    const compressed = req.acceptsEncodings('gzip') && fs.existsSync(file + '.gz');
    res.vary('Accept-Encoding'); res.type(file.endsWith('.js') ? 'application/javascript' : 'text/css');
    res.set('Cache-Control','public, max-age=31536000, immutable');
    if (compressed) res.set('Content-Encoding','gzip');
    res.sendFile(file + (compressed ? '.gz' : ''), err => { if (err) next(err); });
  });
  const index = (req,res) => { res.set('Cache-Control','no-cache'); res.sendFile(path.join(root,'dist','index.html')); };
  app.get(['/', '/index.html'], index);
  app.use(express.static(root, { index:false }));
  app.get('*', index);
};
