import fs from 'node:fs';
import path from 'node:path';

const fontsDir = path.resolve('public/assets/fonts');
if (!fs.existsSync(fontsDir)) {
  fs.mkdirSync(fontsDir, { recursive: true });
}

const weights = [
  { weight: '300', file: 'Inter-Light.woff2', url: 'https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-300-normal.woff2' },
  { weight: '400', file: 'Inter-Regular.woff2', url: 'https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-400-normal.woff2' },
  { weight: '500', file: 'Inter-Medium.woff2', url: 'https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-500-normal.woff2' },
  { weight: '600', file: 'Inter-SemiBold.woff2', url: 'https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-600-normal.woff2' },
  { weight: '700', file: 'Inter-Bold.woff2', url: 'https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-700-normal.woff2' },
];

async function downloadFonts() {
  console.log('Downloading Inter woff2 fonts (SIL OFL)...');
  for (const item of weights) {
    const dest = path.join(fontsDir, item.file);
    if (fs.existsSync(dest) && fs.statSync(dest).size > 1000) {
      console.log(`Already exists: ${item.file}`);
      continue;
    }
    console.log(`Downloading ${item.file} from ${item.url}...`);
    const res = await fetch(item.url);
    if (!res.ok) {
      throw new Error(`Failed to download ${item.url}: ${res.statusText}`);
    }
    const arrayBuffer = await res.arrayBuffer();
    fs.writeFileSync(dest, Buffer.from(arrayBuffer));
    console.log(`Saved ${item.file} (${arrayBuffer.byteLength} bytes)`);
  }
  console.log('All Inter fonts downloaded successfully.');
}

downloadFonts().catch(err => {
  console.error('Font download error:', err);
  process.exit(1);
});
