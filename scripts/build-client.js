const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const zlib = require('node:zlib');

const root = path.join(__dirname, '..', 'public');
function bundle() {
  const js = ['client-libs.js', 'autosave.js', 'app.js', 'mobile.js', 'features2.js', 'features3.js', 'features4.js', 'features5.js', 'features6.js', 'features9.js', 'features9-scoring.js', 'play.js', 'auth-v8.js'];
  const css = ['styles.css', 'premium-v3.css', 'premium-v4.css', 'premium-v5.css', 'premium-v6.css', 'features9.css', 'play.css'];
  const result = {};
  for (const [ext, files] of [['js', js], ['css', css]]) {
    const text = files.map(file => fs.readFileSync(path.join(root, file), 'utf8')).join(ext === 'js' ? '\n;\n' : '\n') + (ext === 'js' ? '\nboot();\n' : '');
    const hash = crypto.createHash('sha256').update(text).digest('hex').slice(0, 12);
    const name = `play.${hash}.${ext}`;
    result[ext] = name;
    fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
    fs.writeFileSync(path.join(root, 'dist', name), text);
    fs.writeFileSync(path.join(root, 'dist', name + '.gz'), zlib.gzipSync(text));
  }
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8').replace('/dist/play.css', '/dist/' + result.css).replace('/dist/play.js', '/dist/' + result.js);
  fs.writeFileSync(path.join(root, 'dist', 'index.html'), html);
  return result;
}
module.exports = bundle;
if (require.main === module) console.log(bundle());
