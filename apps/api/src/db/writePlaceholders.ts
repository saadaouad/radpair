import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { imageCount, seedStudies } from '@/db/catalog.ts';

const outputDir = resolve(dirname(fileURLToPath(import.meta.url)), '../../../web/public/studies');

const fills = ['#292524', '#1c1917', '#44403c', '#0c0a09'];

mkdirSync(outputDir, { recursive: true });

for (const entry of seedStudies) {
  for (let position = 1; position <= imageCount; position += 1) {
    const fill = fills[position - 1] ?? '#1c1917';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="640" viewBox="0 0 640 640" role="img" aria-label="${entry.modality} ${entry.bodyPart} image ${position}">
  <rect width="640" height="640" fill="${fill}"/>
  <rect x="32" y="32" width="576" height="576" fill="none" stroke="#d6d3d1" stroke-width="2"/>
  <text x="56" y="140" fill="#f6f4ef" font-family="sans-serif" font-size="48">${entry.modality}</text>
  <text x="56" y="200" fill="#d6d3d1" font-family="sans-serif" font-size="32">${entry.bodyPart}</text>
  <text x="56" y="560" fill="#a8a29e" font-family="sans-serif" font-size="24">Image ${position}</text>
</svg>
`;
    writeFileSync(resolve(outputDir, `${entry.slug}-${position}.svg`), svg);
  }
}

console.log(`Wrote placeholder images to ${outputDir}`);
