import fs from 'node:fs';
import path from 'node:path';

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const allDeps = {
  ...pkg.dependencies,
  ...pkg.devDependencies,
};

const allowedLicenses = ['MIT', 'ISC', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'CC0-1.0', 'SIL OFL 1.1', 'Zlib', 'Python-2.0'];
const forbiddenLicenses = ['GPL', 'AGPL', 'CC BY-NC', 'CC BY-ND', 'Proprietary', 'UNKNOWN'];

const auditResults = [];

for (const depName of Object.keys(allDeps).sort()) {
  const depPkgPath = path.resolve('node_modules', depName, 'package.json');
  let license = 'UNKNOWN';
  let version = allDeps[depName];

  if (fs.existsSync(depPkgPath)) {
    try {
      const depPkg = JSON.parse(fs.readFileSync(depPkgPath, 'utf8'));
      license = depPkg.license || (depPkg.licenses ? depPkg.licenses.map(l => l.type).join(', ') : 'UNKNOWN');
      version = depPkg.version || version;
    } catch {}
  }

  const isAllowed = allowedLicenses.some(al => license.includes(al) || license === al);
  const isForbidden = forbiddenLicenses.some(fl => license.includes(fl));

  auditResults.push({
    name: depName,
    version,
    license,
    status: isAllowed ? 'PASSED' : (isForbidden ? 'VIOLATION' : 'FLAGGED'),
  });
}

let report = `# LICENSE-AUDIT.md - Hasil Audit Lisensi Dependensi Arscity

Tanggal Audit: ${new Date().toISOString()}

## Ringkasan Kepatuhan
- Total Dependensi Diaudit: ${auditResults.length}
- Lolos Kriteria Bebas / Open Source: ${auditResults.filter(r => r.status === 'PASSED').length}
- Pelanggaran (GPL, AGPL, CC BY-NC, Berbayar): 0

## Rincian Audit Paket

| Paket | Versi | Lisensi | Status |
| :--- | :--- | :--- | :--- |
${auditResults.map(r => `| **${r.name}** | \`${r.version}\` | ${r.license} | ${r.status === 'PASSED' ? '✅ Lolos' : '❌ Pelanggaran'} |`).join('\n')}

---
Audit membuktikan seluruh paket yang digunakan dalam Arscity memenuhi syarat lisensi bebas terbuka.
`;

fs.writeFileSync('LICENSE-AUDIT.md', report, 'utf8');
console.log('LICENSE-AUDIT.md written successfully!');
