const fs = require('fs');
const path = require('path');

function walk(dir, list = []) {
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      if (f !== 'node_modules' && f !== '.git') walk(full, list);
    } else if (f.endsWith('.tsx') || f.endsWith('.ts') || f.endsWith('.css')) {
      list.push(full);
    }
  }
  return list;
}

const files = walk('./src');
const matches = [];

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, i) => {
    const hasBg = /background|backgroundColor|style=.*bg|className=.*bg-/i.test(line);
    if (!hasBg) return;

    const isDarkHex = /#(0f172a|18181b|1e293b|020617|09090b|111827|121214|1c1c1e)/i.test(line);
    const isDarkRgba = /rgba?\(\s*(15\s*,\s*23\s*,\s*42|0\s*,\s*0\s*,\s*0|18\s*,\s*18\s*,\s*27|2\s*,\s*6\s*,\s*23|28\s*,\s*28\s*,\s*30)/i.test(line);
    const isTailwindDark = /bg-(slate|zinc|neutral|gray)-(800|900|950)|bg-black/i.test(line);

    if (isDarkHex || isDarkRgba || isTailwindDark) {
      matches.push({ file, line: i + 1, content: line.trim() });
    }
  });
}

console.log('Total dark background matches found: ' + matches.length);
matches.forEach(m => console.log(`${m.file}:${m.line} -> ${m.content}`));

// Also write output to docs/audit/warna_gelap.txt if needed or check it
fs.writeFileSync(
  path.join(__dirname, 'warna_gelap_audit.txt'),
  `Total Temuan: ${matches.length}\nWaktu Audit: ${new Date().toISOString()}\n\n` +
  matches.map(m => `${m.file}:${m.line} -> ${m.content}`).join('\n'),
  'utf8'
);
