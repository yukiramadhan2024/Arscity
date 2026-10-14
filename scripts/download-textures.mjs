import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const texturesBaseDir = path.resolve('public/assets/textures');
const tempDir = path.resolve('public/assets/textures/_temp');

if (!fs.existsSync(texturesBaseDir)) {
  fs.mkdirSync(texturesBaseDir, { recursive: true });
}
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

const materials = [
  {
    name: 'aspal',
    label: 'Aspal Jalan (Asphalt Road)',
    source: 'ambientcg',
    assetId: 'Asphalt010',
    url: 'https://ambientcg.com/get?file=Asphalt010_1K-JPG.zip',
    pageUrl: 'https://ambientcg.com/view?id=Asphalt010',
    license: 'CC0 1.0 Universal',
    uvScaleM: 4.0, // 4 meters per tile
  },
  {
    name: 'beton',
    label: 'Beton Struktural (Concrete)',
    source: 'ambientcg',
    assetId: 'Concrete034',
    url: 'https://ambientcg.com/get?file=Concrete034_1K-JPG.zip',
    pageUrl: 'https://ambientcg.com/view?id=Concrete034',
    license: 'CC0 1.0 Universal',
    uvScaleM: 3.0,
  },
  {
    name: 'bata_merah',
    label: 'Bata Merah Expose (Red Brick)',
    source: 'ambientcg',
    assetId: 'Bricks059',
    url: 'https://ambientcg.com/get?file=Bricks059_1K-JPG.zip',
    pageUrl: 'https://ambientcg.com/view?id=Bricks059',
    license: 'CC0 1.0 Universal',
    uvScaleM: 2.0,
  },
  {
    name: 'plester',
    label: 'Plester Dinding Halus (Plaster)',
    source: 'ambientcg',
    assetId: 'Plaster001',
    url: 'https://ambientcg.com/get?file=Plaster001_1K-JPG.zip',
    pageUrl: 'https://ambientcg.com/view?id=Plaster001',
    license: 'CC0 1.0 Universal',
    uvScaleM: 3.0,
  },
  {
    name: 'genteng',
    label: 'Genteng Tanah Liat (Clay Roof Tiles)',
    source: 'ambientcg',
    assetId: 'RoofingTiles001',
    url: 'https://ambientcg.com/get?file=RoofingTiles001_1K-JPG.zip',
    pageUrl: 'https://ambientcg.com/view?id=RoofingTiles001',
    license: 'CC0 1.0 Universal',
    uvScaleM: 2.0,
  },
  {
    name: 'kayu',
    label: 'Kayu Alami / Parket (Natural Wood)',
    source: 'ambientcg',
    assetId: 'Wood051',
    url: 'https://ambientcg.com/get?file=Wood051_1K-JPG.zip',
    pageUrl: 'https://ambientcg.com/view?id=Wood051',
    license: 'CC0 1.0 Universal',
    uvScaleM: 2.5,
  },
  {
    name: 'rumput',
    label: 'Rumput Taman Tropis (Grass)',
    source: 'ambientcg',
    assetId: 'Grass001',
    url: 'https://ambientcg.com/get?file=Grass001_1K-JPG.zip',
    pageUrl: 'https://ambientcg.com/view?id=Grass001',
    license: 'CC0 1.0 Universal',
    uvScaleM: 4.0,
  },
  {
    name: 'paving',
    label: 'Paving Block Trotoar (Paving Stones)',
    source: 'ambientcg',
    assetId: 'PavingStones038',
    url: 'https://ambientcg.com/get?file=PavingStones038_1K-JPG.zip',
    pageUrl: 'https://ambientcg.com/view?id=PavingStones038',
    license: 'CC0 1.0 Universal',
    uvScaleM: 2.0,
  },
  {
    name: 'trotoar',
    label: 'Plat Trotoar Beton (Sidewalk Slabs)',
    source: 'ambientcg',
    assetId: 'PavingStones067',
    url: 'https://ambientcg.com/get?file=PavingStones067_1K-JPG.zip',
    pageUrl: 'https://ambientcg.com/view?id=PavingStones067',
    license: 'CC0 1.0 Universal',
    uvScaleM: 2.0,
  },
  {
    name: 'tanah',
    label: 'Tanah Subur / Resapan (Soil Ground)',
    source: 'ambientcg',
    assetId: 'Ground003',
    url: 'https://ambientcg.com/get?file=Ground003_1K-JPG.zip',
    pageUrl: 'https://ambientcg.com/view?id=Ground003',
    license: 'CC0 1.0 Universal',
    uvScaleM: 4.0,
  },
  {
    name: 'batu_alam',
    label: 'Batu Alam Plinth (Natural Stone Rock)',
    source: 'ambientcg',
    assetId: 'Rock026',
    url: 'https://ambientcg.com/get?file=Rock026_1K-JPG.zip',
    pageUrl: 'https://ambientcg.com/view?id=Rock026',
    license: 'CC0 1.0 Universal',
    uvScaleM: 3.0,
  },
  {
    name: 'metal',
    label: 'Metal Lembaran / Seng Gelap (Dark Metal/Zinc)',
    source: 'ambientcg',
    assetId: 'Metal028',
    url: 'https://ambientcg.com/get?file=Metal028_1K-JPG.zip',
    pageUrl: 'https://ambientcg.com/view?id=Metal028',
    license: 'CC0 1.0 Universal',
    uvScaleM: 2.0,
  },
  {
    name: 'air',
    label: 'Permukaan Air Genangan / Sungai (Water Normals)',
    source: 'threejs-cc0',
    assetId: 'WaterNormals',
    url: 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/waternormals.jpg',
    pageUrl: 'https://github.com/mrdoob/three.js/tree/dev/examples/textures',
    license: 'MIT / CC0 Equivalent',
    uvScaleM: 4.0,
  },
];

async function downloadFile(url, destPath) {
  console.log(`Fetching ${url} -> ${destPath}`);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download ${url}: ${res.statusText}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  fs.writeFileSync(destPath, Buffer.from(arrayBuffer));
  return arrayBuffer.byteLength;
}

async function processAll() {
  const manifest = {
    title: 'Arscity CC0 PBR Texture Manifest',
    generatedAt: new Date().toISOString(),
    resolution: '1K',
    format: 'JPG',
    materials: {},
  };

  for (const mat of materials) {
    const matDir = path.join(texturesBaseDir, mat.name);
    if (!fs.existsSync(matDir)) {
      fs.mkdirSync(matDir, { recursive: true });
    }

    console.log(`\n================== Processing [${mat.name}] (${mat.assetId}) ==================`);

    if (mat.name === 'air') {
      const normalDest = path.join(matDir, 'normal.jpg');
      if (!fs.existsSync(normalDest) || fs.statSync(normalDest).size < 1000) {
        await downloadFile(mat.url, normalDest);
      } else {
        console.log(`Normal map for ${mat.name} already exists.`);
      }

      // Create subtle blue-tint color map for water fallback if not exists
      const colorDest = path.join(matDir, 'color.jpg');
      if (!fs.existsSync(colorDest)) {
        // Create 2x2 blue jpg or copy
        fs.copyFileSync(normalDest, colorDest); // placeholder color map
      }

      manifest.materials[mat.name] = {
        name: mat.name,
        label: mat.label,
        assetId: mat.assetId,
        source: mat.source,
        license: mat.license,
        sourceUrl: mat.pageUrl,
        downloadDate: new Date().toISOString().split('T')[0],
        uvScaleM: mat.uvScaleM,
        files: {
          normal: `/assets/textures/${mat.name}/normal.jpg`,
          color: `/assets/textures/${mat.name}/color.jpg`,
        },
      };
      continue;
    }

    const zipFile = path.join(tempDir, `${mat.assetId}.zip`);
    const extractSubDir = path.join(tempDir, mat.assetId);

    // Check if material textures already exist in matDir
    const expectedColor = path.join(matDir, 'color.jpg');
    const expectedNormal = path.join(matDir, 'normal.jpg');
    const expectedRoughness = path.join(matDir, 'roughness.jpg');

    if (
      fs.existsSync(expectedColor) &&
      fs.existsSync(expectedNormal) &&
      fs.existsSync(expectedRoughness) &&
      fs.statSync(expectedColor).size > 1000
    ) {
      console.log(`Textures for ${mat.name} already present.`);
    } else {
      if (!fs.existsSync(zipFile) || fs.statSync(zipFile).size < 10000) {
        await downloadFile(mat.url, zipFile);
      }

      if (!fs.existsSync(extractSubDir)) {
        fs.mkdirSync(extractSubDir, { recursive: true });
      }

      console.log(`Extracting ${zipFile} with tar...`);
      execSync(`tar -xf "${zipFile}" -C "${extractSubDir}"`);

      // Find extracted files
      const extractedFiles = fs.readdirSync(extractSubDir);
      console.log(`Extracted ${extractedFiles.length} files for ${mat.assetId}`);

      const colorFile = extractedFiles.find(f => f.includes('Color.jpg') || f.includes('color.jpg'));
      const normalFile = extractedFiles.find(f => f.includes('NormalGL.jpg') || f.includes('NormalDX.jpg') || f.includes('Normal.jpg'));
      const roughnessFile = extractedFiles.find(f => f.includes('Roughness.jpg') || f.includes('roughness.jpg'));
      const aoFile = extractedFiles.find(f => f.includes('AmbientOcclusion.jpg') || f.includes('ao.jpg') || f.includes('AO.jpg'));

      if (colorFile) {
        fs.copyFileSync(path.join(extractSubDir, colorFile), expectedColor);
      }
      if (normalFile) {
        fs.copyFileSync(path.join(extractSubDir, normalFile), expectedNormal);
      }
      if (roughnessFile) {
        fs.copyFileSync(path.join(extractSubDir, roughnessFile), expectedRoughness);
      }
      if (aoFile) {
        fs.copyFileSync(path.join(extractSubDir, aoFile), path.join(matDir, 'ao.jpg'));
      }

      // Clean up extracted temp subfolder and zip
      try {
        fs.rmSync(extractSubDir, { recursive: true, force: true });
        fs.unlinkSync(zipFile);
      } catch (err) {
        console.warn(`Clean up warning:`, err.message);
      }
    }

    manifest.materials[mat.name] = {
      name: mat.name,
      label: mat.label,
      assetId: mat.assetId,
      source: mat.source,
      license: mat.license,
      sourceUrl: mat.pageUrl,
      downloadDate: new Date().toISOString().split('T')[0],
      uvScaleM: mat.uvScaleM,
      files: {
        color: `/assets/textures/${mat.name}/color.jpg`,
        normal: `/assets/textures/${mat.name}/normal.jpg`,
        roughness: `/assets/textures/${mat.name}/roughness.jpg`,
        ao: fs.existsSync(path.join(matDir, 'ao.jpg')) ? `/assets/textures/${mat.name}/ao.jpg` : undefined,
      },
    };
  }

  // Clean tempDir
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch (e) {}

  const manifestPath = path.join(texturesBaseDir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`\nSuccessfully generated manifest.json at ${manifestPath}`);
  console.log(`Total materials configured: ${Object.keys(manifest.materials).length}`);
}

processAll().catch(err => {
  console.error('Texture download error:', err);
  process.exit(1);
});
