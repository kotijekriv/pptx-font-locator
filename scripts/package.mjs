/** Reproducible local-only release archives using Node built-ins, no Git/network. */
import { readFile,writeFile,mkdir,rm,lstat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
const root=resolve(import.meta.dirname,'..'), release=resolve(root,'release');
const version=JSON.parse(await readFile(resolve(root,'package.json'),'utf8')).version;
if(!/^\d+\.\d+\.\d+$/.test(version))throw Error('Expected a numeric release version.');
export const SOURCE_FILES=[
 'verification/screen-readability.json',
 '.gitignore','package.json','package-lock.json','tsconfig.json','index.html',
 'README.md','LICENSE','THIRD_PARTY_NOTICES.md','HANDOFF.md','PROGRESS.md',
 'src/scanner.ts','src/main.ts','src/style.css','src/zip.ts','src/vite-env.d.ts',
 'scripts/fixtures.ts','scripts/fixture-source.ts','scripts/standalone.mjs','scripts/browser-regression.mjs','scripts/package.mjs',
 'public/synthetic-fonts.pptx','tests/scanner.test.ts','tests/part-identity.test.ts',
 'verification/review-2026-10-20.md','verification/review-2026-10-20.json',
 'verification/fixtures/independent-master-font.pptx','verification/independent-reference.json','verification/hidden-locations.json',
 'verification/browser-regression-chrome.json','verification/browser-regression-firefox.json'
];
const RUN_FILES=[['pptx-font-locator-standalone.html','dist/pptx-font-locator-standalone.html'],['README.md','README.md'],['LICENSE','LICENSE'],['THIRD_PARTY_NOTICES.md','THIRD_PARTY_NOTICES.md'],['synthetic-fonts.pptx','public/synthetic-fonts.pptx'],['independent-master-font.pptx','verification/fixtures/independent-master-font.pptx'],['independent-reference.json','verification/independent-reference.json'],['hidden-locations.json','verification/hidden-locations.json']];
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const table=Array.from({length:256},(_,c)=>{for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
function crc(bytes){let c=0xffffffff;for(const b of bytes)c=table[(c^b)&255]^(c>>>8);return(c^0xffffffff)>>>0;}
function zip(entries){
 const local=[],central=[];let offset=0;
 for(const [name,bytes]of entries.sort((a,b)=>a[0]<b[0]?-1:a[0]>b[0]?1:0)){
  const n=Buffer.from(name),size=bytes.length,sum=crc(bytes),header=Buffer.alloc(30);header.writeUInt32LE(0x04034b50,0);header.writeUInt16LE(20,4);header.writeUInt16LE(0x800,6);header.writeUInt16LE(0,8);header.writeUInt16LE(0x5d54,12);header.writeUInt32LE(sum,14);header.writeUInt32LE(size,18);header.writeUInt32LE(size,22);header.writeUInt16LE(n.length,26);
  local.push(header,n,bytes);const cd=Buffer.alloc(46);cd.writeUInt32LE(0x02014b50,0);cd.writeUInt16LE(0x314,4);cd.writeUInt16LE(20,6);cd.writeUInt16LE(0x800,8);cd.writeUInt16LE(0x5d54,14);cd.writeUInt32LE(sum,16);cd.writeUInt32LE(size,20);cd.writeUInt32LE(size,24);cd.writeUInt16LE(n.length,28);cd.writeUInt32LE((0o100644<<16)>>>0,38);cd.writeUInt32LE(offset,42);central.push(cd,n);offset+=header.length+n.length+size;
 }
 const directory=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(entries.length,8);end.writeUInt16LE(entries.length,10);end.writeUInt32LE(directory.length,12);end.writeUInt32LE(offset,16);return Buffer.concat([...local,directory,end]);
}
async function safeRead(relative){
 const path=resolve(root,relative);if((await lstat(path)).isSymbolicLink())throw Error('No symlinks allowed: '+relative);const bytes=await readFile(path);
 if(/(?:\/Users\/|\/home\/|[A-Z]:\\Users\\|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})/.test(bytes.toString('utf8')))throw Error('Private path or credential-shaped text in '+relative);
 return bytes;
}
await mkdir(release,{recursive:true});const folder=resolve(release,'pptx-font-locator');await rm(folder,{recursive:true,force:true});await mkdir(folder);
const runEntries=[];for(const [name,source]of RUN_FILES){const bytes=await safeRead(source);runEntries.push(['pptx-font-locator/'+name,bytes]);await writeFile(resolve(folder,name),bytes);}
const sourceEntries=[];for(const path of SOURCE_FILES)sourceEntries.push(['pptx-font-locator-source/'+path,await safeRead(path)]);
const artifacts={};for(const [name,entries]of [[`pptx-font-locator-${version}.zip`,runEntries],[`pptx-font-locator-${version}-source.zip`,sourceEntries]]){
 const bytes=zip(entries);await writeFile(resolve(release,name),bytes);artifacts[name]={sha256:hash(bytes),bytes:bytes.length,entries:entries.map(([name,bytes])=>({path:name,bytes:bytes.length,sha256:hash(bytes)}))};
 await writeFile(resolve(release,name+'.sha256'),`${hash(bytes)}  ${name}\n`);
}
const manifest={version,scope:'Local experimental package; not published or market-validated',format:'Deterministic stored ZIP, fixed DOS timestamp 2026-10-20 00:00, regular file mode 0644',artifacts};
await writeFile(resolve(release,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
const summary=Object.fromEntries(Object.entries(artifacts).map(([name,a])=>[name,{bytes:a.bytes,sha256:a.sha256,entries:a.entries.length}]));
console.log(JSON.stringify(summary,null,2));
