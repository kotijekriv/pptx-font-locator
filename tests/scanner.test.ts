// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { strToU8, zipSync } from 'fflate';
import { scanPptx, filterReferences, csvReport, LIMITS } from '../src/scanner';
import { fixtureParts, packageParts } from '../scripts/fixture-source';
const scan = (parts=fixtureParts())=>scanPptx(packageParts(parts),'synthetic.pptx');
describe('exact stored font locations',()=>{
  it('finds visible text and all four unused list levels with exact paths and shape context',()=>{
    const report=scan();const r=filterReferences(report,'Ghost Sans');expect(r).toHaveLength(5);
    for(const level of [2,3,4,5]){const match=r.find(x=>x.part==='ppt/slides/slide1.xml'&&x.listLevel===level)!;expect(match.location).toBe('Slide 1');expect(match.path).toBe(`/p:sld[1]/p:cSld[1]/p:spTree[1]/p:sp[1]/p:txBody[1]/a:lstStyle[1]/a:lvl${level}pPr[1]/a:defRPr[1]/a:latin[1]/@typeface`);expect(match.shape).toBe('Demo title (id 2)');expect(match.placeholder).toBe('title (index 0)');expect(match.text).toBeNull();expect(match.context).toContain('Style declaration');}
    expect(report.references.find(x=>x.font==='Visible Serif')?.text).toBe('Synthetic font locator example');
  });
  it('includes master, layout, notes, notes master, bullet and alternate-script declarations',()=>{
    const refs=scan().references;
    expect(refs.find(r=>r.font==='Master Bullet')).toMatchObject({part:'ppt/slideMasters/slideMaster1.xml',listLevel:3,script:'Bullet'});
    expect(refs.find(r=>r.font==='Layout Sans')).toMatchObject({part:'ppt/slideLayouts/slideLayout1.xml',context:'Empty paragraph'});
    expect(refs.find(r=>r.font==='Notes Mono')).toMatchObject({location:'Notes for slide 1'});
    expect(refs.find(r=>r.font==='Notes Master Sans')?.part).toBe('ppt/notesMasters/notesMaster1.xml');
    expect(refs.find(r=>r.font==='Yu Gothic')).toMatchObject({script:'Jpan',part:'ppt/theme/theme1.xml'});
  });
  it('separates explicit fonts, resolved theme declarations and unresolved fallback',()=>{
    const refs=scan().references;expect(refs.find(r=>r.font==='+mj-lt')).toMatchObject({kind:'theme token',resolvedFont:'Theme Serif'});
    expect(refs.find(r=>r.font==='+mn-cs')).toMatchObject({resolvedFont:'Theme Arabic'});
    expect(refs.find(r=>r.font==='+mj-ea')).toMatchObject({resolvedFont:null});
    expect(filterReferences(scan(),'theme serif').some(r=>r.font==='+mj-lt')).toBe(true);
  });
  it('ignores namespace spelling and preserves semantic paths',()=>{expect(scan(fixtureParts(true)).references).toEqual(scan().references);});
  it('uses presentation order rather than part filename as slide number',()=>{
    const p=fixtureParts();p['ppt/slides/slide9.xml']=p['ppt/slides/slide1.xml'];p['ppt/slides/_rels/slide9.xml.rels']=p['ppt/slides/_rels/slide1.xml.rels'];delete p['ppt/slides/slide1.xml'];delete p['ppt/slides/_rels/slide1.xml.rels'];p['ppt/_rels/presentation.xml.rels']=p['ppt/_rels/presentation.xml.rels'].replace('slides/slide1.xml','slides/slide9.xml');expect(scan(p).references.find(r=>r.font==='Visible Serif')?.location).toBe('Slide 1');
  });
  it('never changes the original package bytes',()=>{const input=packageParts(fixtureParts()),before=input.slice();scanPptx(input);expect(input).toEqual(before);});
});
describe('unsupported, malformed and bounded packages',()=>{
  it('rejects non-ZIP, encrypted Office and unrelated ZIP files',()=>{for(const input of [strToU8('plain text'),new Uint8Array([0xd0,0xcf,0x11,0xe0]),zipSync({'file.txt':strToU8('no presentation')})])expect(()=>scanPptx(input)).toThrow();});
  it('rejects malformed XML and DTDs before claiming a complete report',()=>{for(const xml of ['<bad>','<!DOCTYPE a [<!ENTITY x "boom">]><a/>']){const p=fixtureParts();p['ppt/slides/slide1.xml']=xml;expect(()=>scan(p)).toThrow();}});
  it('rejects wrong presentation type and macro-enabled input',()=>{const p=fixtureParts();p['[Content_Types].xml']=p['[Content_Types].xml'].replace('presentation.main+xml','macroEnabled.main+xml');expect(()=>scan(p)).toThrow(/standard unencrypted/);});
  it('rejects damaged deflate or mismatched CRC',()=>{const b=packageParts(fixtureParts());b[55]^=0xff;expect(()=>scanPptx(b)).toThrow();});
  it('rejects encrypted ZIP flags',()=>{const b=packageParts(fixtureParts()),v=new DataView(b.buffer);for(let i=0;i<b.length-46;i++)if(v.getUint32(i,true)===0x02014b50){v.setUint16(i+8,v.getUint16(i+8,true)|1,true);break;}expect(()=>scanPptx(b)).toThrow(/Encrypted ZIP/);});
  it('rejects input, ZIP expansion and XML depth caps',()=>{expect(()=>scanPptx(new Uint8Array(LIMITS.fileBytes+1))).toThrow(/40 MiB/);const b=packageParts(fixtureParts()),v=new DataView(b.buffer);for(let i=0;i<b.length-46;i++)if(v.getUint32(i,true)===0x02014b50){v.setUint32(i+24,LIMITS.entryBytes+1,true);break;}expect(()=>scanPptx(b)).toThrow(/expanded-size/);const p=fixtureParts();p['ppt/deep.xml']='<x>'.repeat(101)+'</x>'.repeat(101);expect(()=>scan(p)).toThrow(/depth limit/);});
  it('bounds actual deflate expansion if the advertised size is forged smaller',()=>{const b=zipSync({'huge.xml':strToU8('a'.repeat(100000))}),v=new DataView(b.buffer);for(let i=0;i<b.length-46;i++)if(v.getUint32(i,true)===0x02014b50){v.setUint32(i+24,10,true);break;}expect(()=>scanPptx(b)).toThrow(/exceeds its declared size/);});
  it('rejects oversized XML parts and duplicate or unsafe names',()=>{const p=fixtureParts();p['ppt/big.xml']='<x>'+ ' '.repeat(LIMITS.xmlBytes)+'</x>';expect(()=>scan(p)).toThrow(/XML exceeds/);expect(()=>scanPptx(zipSync({'../unsafe':strToU8('x')}))).toThrow(/unsafe/);});
});
describe('exports and untrusted strings',()=>{
  it('preserves literal font strings and prevents spreadsheet formulas',()=>{const p=fixtureParts();p['ppt/slides/slide1.xml']=p['ppt/slides/slide1.xml'].replace('Visible Serif','&lt;img src=x onerror=alert(1)&gt;');const report=scan(p);expect(report.references.some(r=>r.font==='<img src=x onerror=alert(1)>')).toBe(true);const csv=csvReport(report.references);expect(csv).toContain('"\'+mj-ea"');expect(csv).toContain('"<img src=x onerror=alert(1)>"');});
});
