import { writeFileSync, mkdirSync } from 'node:fs';
import { fixtureParts, packageParts } from './fixture-source';
mkdirSync('public', {recursive:true});
const bytes=packageParts(fixtureParts());
writeFileSync('public/synthetic-fonts.pptx', bytes);
writeFileSync('src/demo.generated.ts', `// Generated from original fixture-source.ts; no external data.\nexport default ${JSON.stringify(Buffer.from(bytes).toString('base64'))};\n`);
console.log('Wrote original synthetic structural PPTX demo; no external source material.');
