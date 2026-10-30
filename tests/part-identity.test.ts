// @vitest-environment jsdom
import { expect, it } from 'vitest';
import { scanPptx } from '../src/scanner';
import { fixtureParts, packageParts, R } from '../scripts/fixture-source';

function renamedSlide(extension: string) {
  const p=fixtureParts(), renamed=`ppt/slides/slide1.${extension}`;
  p[renamed]=p['ppt/slides/slide1.xml'];
  p[`ppt/slides/_rels/slide1.${extension}.rels`]=p['ppt/slides/_rels/slide1.xml.rels'];
  delete p['ppt/slides/slide1.xml']; delete p['ppt/slides/_rels/slide1.xml.rels'];
  p['[Content_Types].xml']=p['[Content_Types].xml'].replace('/ppt/slides/slide1.xml',`/${renamed}`);
  p['ppt/_rels/presentation.xml.rels']=p['ppt/_rels/presentation.xml.rels'].replace('slides/slide1.xml',`slides/slide1.${extension}`);
  return p;
}
it('includes an uppercase XML slide without silently dropping its fonts',()=>{
  const base=scanPptx(packageParts(fixtureParts()));
  const report=scanPptx(packageParts(renamedSlide('XML')));
  expect(report.references).toHaveLength(base.references.length);
  expect(report.references.find(r=>r.font==='Visible Serif')).toMatchObject({part:'ppt/slides/slide1.XML',location:'Slide 1'});
});
it('recognizes an explicitly XML content-typed slide with a custom extension',()=>{
  const report=scanPptx(packageParts(renamedSlide('part')));
  expect(report.references.find(r=>r.font==='Visible Serif')).toMatchObject({part:'ppt/slides/slide1.part',location:'Slide 1'});
  expect(report.references).toHaveLength(scanPptx(packageParts(fixtureParts())).references.length);
});
it('ignores custom relationship types with an Office-looking suffix',()=>{
  const p=fixtureParts();
  p['ppt/theme/decoy.xml']=p['ppt/theme/theme1.xml'].replaceAll('Theme Serif','Decoy Font');
  p['ppt/slideMasters/_rels/slideMaster1.xml.rels']=p['ppt/slideMasters/_rels/slideMaster1.xml.rels']
    .replace('</Relationships>','<Relationship Id="custom" Type="https://example.invalid/custom/theme" Target="../theme/decoy.xml"/></Relationships>');
  expect(scanPptx(packageParts(p)).references.find(r=>r.font==='+mj-lt')?.resolvedFont).toBe('Theme Serif');
});
it('accepts the full strict Office relationship namespace',()=>{
  const p=fixtureParts();
  for(const name of Object.keys(p)) p[name]=p[name].replaceAll(R,'http://purl.oclc.org/ooxml/officeDocument/relationships');
  const report=scanPptx(packageParts(p));
  expect(report.references.find(r=>r.font==='Visible Serif')?.location).toBe('Slide 1');
  expect(report.references.find(r=>r.font==='+mj-lt')?.resolvedFont).toBe('Theme Serif');
});
it('a custom id attribute containing relationships cannot replace the Office id',()=>{
  const p=fixtureParts();
  p['ppt/presentation.xml']=p['ppt/presentation.xml'].replace('<p:sldId id="256" r:id="rId1"', '<p:sldId id="256" xmlns:e="https://example.invalid/relationships" e:id="rId2" r:id="rId1"');
  expect(scanPptx(packageParts(p)).references.find(r=>r.font==='Visible Serif')?.location).toBe('Slide 1');
});
