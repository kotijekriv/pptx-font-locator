import { LIMITS, readZip, ScanError } from './zip';
export { LIMITS, ScanError };
const DML = new Set(['http://schemas.openxmlformats.org/drawingml/2006/main', 'http://purl.oclc.org/ooxml/drawingml/main']);
const PML = new Set(['http://schemas.openxmlformats.org/presentationml/2006/main', 'http://purl.oclc.org/ooxml/presentationml/main']);
const REL = 'http://schemas.openxmlformats.org/package/2006/relationships';
const CONTENT_TYPES = 'http://schemas.openxmlformats.org/package/2006/content-types';
const OFFICE_REL = new Set(['http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'http://purl.oclc.org/ooxml/officeDocument/relationships']);
const relationshipTypes = new Map<string, string>(
  [...OFFICE_REL].flatMap(ns => ['slide','slideLayout','slideMaster','notesSlide','notesMaster','handoutMaster','theme','themeOverride']
    .map(type => [`${ns}/${type}`, type] as const)),
);
export interface FontReference { id: number; font: string; kind: 'explicit' | 'theme token'; resolvedFont: string | null; resolution: string; part: string; location: string; path: string; shape: string | null; placeholder: string | null; listLevel: number | null; context: string; script: string; text: string | null; }
export interface ScanReport { version: 1; fileName: string; status: 'COMPLETE'; scope: string; references: FontReference[]; partsScanned: number; entries: number; warnings: string[]; }
interface Relationship { type: string; target: string; }
function elements(el: Element | Document): Element[] { return Array.from(el.children ?? []).length ? Array.from(el.children) : Array.from(el.childNodes).filter((n): n is Element => n.nodeType === 1); }
function all(el: Element | Document): Element[] { return Array.from(el.getElementsByTagName('*')); }
function dml(el: Element, local?: string) { return DML.has(el.namespaceURI ?? '') && (!local || el.localName === local); }
function pml(el: Element, local?: string) { return PML.has(el.namespaceURI ?? '') && (!local || el.localName === local); }
function canonical(el: Element) { return `${DML.has(el.namespaceURI ?? '') ? 'a' : PML.has(el.namespaceURI ?? '') ? 'p' : el.prefix || 'ns'}:${el.localName}`; }
function resolvePath(source: string, target: string): string | null { if (/[?#\\]/.test(target) || /^[a-z]+:/i.test(target)) return null; const out: string[] = target.startsWith('/') ? [] : source.split('/').slice(0, -1); for (const piece of target.split('/')) { if (!piece || piece === '.') continue; if (piece === '..') { if (!out.length) return null; out.pop(); } else out.push(piece); } return out.join('/'); }
export function scanPptx(bytes: Uint8Array, fileName = 'presentation.pptx'): ScanReport {
  const zip = readZip(bytes), docs = new Map<string, Document>(); let nodeCount = 0, xmlBytes = 0;
  const paths = new WeakMap<Element, string>(), shapeCache = new WeakMap<Element, { nv?: Element; ph?: Element }>(), textCache = new WeakMap<Element, string>(), tokenCache = new Map<string, [string | null, string]>(), themeCache = new Map<string, Map<string, Set<string>>>();
  const parse = (part: string): Document => {
    const existing = docs.get(part); if (existing) return existing;
    const data = zip.get(part); if (!data) throw new ScanError('INVALID', `Required XML part is missing: ${part}`);
    xmlBytes += data.length; if (data.length > LIMITS.xmlBytes || xmlBytes > LIMITS.xmlTotalBytes) throw new ScanError('LIMITED', 'XML exceeds the 2 MiB per-part or 16 MiB total XML limit.');
    let source: string; try { source = new TextDecoder('utf-8', { fatal: true }).decode(data); } catch { throw new ScanError('UNSUPPORTED', `Only UTF-8 XML is supported: ${part}`); }
    if (/<!\s*(?:DOCTYPE|ENTITY)/i.test(source)) throw new ScanError('UNSUPPORTED', `DTD and entity declarations are unsupported: ${part}`);
    // Reject excessive tag counts before allocating a native DOM. The complete
    // parsed tree is still checked for element count and depth below.
    if ((source.match(/<(?![!?/])/g)?.length ?? 0) > LIMITS.nodes - nodeCount) throw new ScanError('LIMITED', 'XML exceeds the 200,000-element limit.');
    const doc = new DOMParser().parseFromString(source, 'application/xml');
    if (doc.getElementsByTagName('parsererror').length || !doc.documentElement) throw new ScanError('INVALID', `Malformed XML: ${part}`);
    paths.set(doc.documentElement, '/' + canonical(doc.documentElement) + '[1]');
    const queue: [Element, number][] = [[doc.documentElement, 1]];
    while (queue.length) { const [el, depth] = queue.pop()!; if (++nodeCount > LIMITS.nodes || depth > LIMITS.depth) throw new ScanError('LIMITED', 'XML exceeds the 200,000-element or 100-level depth limit.'); const counts = new Map<string, number>(); for (const child of elements(el)) { const name = canonical(child); const index = (counts.get(name) ?? 0) + 1; counts.set(name,index); paths.set(child, paths.get(el) + '/' + name + '[' + index + ']'); queue.push([child, depth + 1]); } }
    docs.set(part, doc); return doc;
  };
  if (!zip.has('[Content_Types].xml') || !zip.has('ppt/presentation.xml')) throw new ScanError('UNSUPPORTED', 'This package does not contain a supported PPTX presentation.');
  const ct = parse('[Content_Types].xml');
  if (!all(ct).some(e => e.namespaceURI === 'http://schemas.openxmlformats.org/package/2006/content-types' && e.localName === 'Override' && e.getAttribute('PartName') === '/ppt/presentation.xml' && e.getAttribute('ContentType') === 'application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml')) throw new ScanError('UNSUPPORTED', 'Only standard unencrypted .pptx packages are supported; macro-enabled decks are excluded.');
  if (!pml(parse('ppt/presentation.xml').documentElement, 'presentation')) throw new ScanError('INVALID', 'The presentation root namespace is invalid.');
  const overrides = new Map<string, string>(), defaults = new Map<string, string>();
  for (const item of all(ct)) if (item.namespaceURI === CONTENT_TYPES) {
    if (item.localName === 'Override') overrides.set((item.getAttribute('PartName') ?? '').replace(/^\//, ''), (item.getAttribute('ContentType') ?? '').toLowerCase());
    if (item.localName === 'Default') defaults.set((item.getAttribute('Extension') ?? '').toLowerCase(), (item.getAttribute('ContentType') ?? '').toLowerCase());
  }
  const contentType = (part: string) => overrides.get(part) ?? defaults.get(part.split('.').pop()!.toLowerCase()) ?? '';
  const isXmlPart = (part: string) => {
    const type = contentType(part);
    return !/\.rels$/i.test(part) && (type.endsWith('+xml') || type === 'application/xml' || type === 'text/xml' || /\.xml$/i.test(part));
  };
  const relations = new Map<string, Relationship[]>(), relationIds = new Map<string, Map<string, string>>();
  const warnings = new Set<string>();
  for (const name of zip.keys()) if (/\.rels$/i.test(name) && (name.startsWith('ppt/') || name === '_rels/.rels')) {
    const source = name === '_rels/.rels' ? '' : name.replace(/\/_rels\/([^/]+)\.rels$/i, '/$1');
    const list: Relationship[] = [], ids = new Map<string, string>();
    for (const el of all(parse(name))) if (el.localName === 'Relationship' && el.namespaceURI === REL) {
      if (el.getAttribute('TargetMode') === 'External') continue;
      const type = relationshipTypes.get(el.getAttribute('Type') ?? '');
      if (!type) continue;
      const target = resolvePath(source, el.getAttribute('Target') ?? '');
      if (!target) { warnings.add(`Unresolvable relationship in ${name}.`); continue; }
      const id = el.getAttribute('Id') ?? '';
      if (!id || ids.has(id)) throw new ScanError('INVALID', `Missing or duplicate Office relationship identifier in ${name}.`);
      list.push({ type, target }); ids.set(id, target);
    }
    relations.set(source, list); relationIds.set(source, ids);
  }
  const slides = new Map<string, number>();
  for (const el of all(parse('ppt/presentation.xml'))) if (pml(el, 'sldId')) { const rid = Array.from(el.attributes).find(a => a.localName === 'id' && OFFICE_REL.has(a.namespaceURI ?? ''))?.value; const target = rid && relationIds.get('ppt/presentation.xml')?.get(rid); if (target) slides.set(target, slides.size + 1); }
  function location(part: string): string { if (slides.has(part)) return `Slide ${slides.get(part)}`; const types: [string, string][] = [['slideMasters','Slide master'],['slideLayouts','Slide layout'],['notesMasters','Notes master'],['notesSlides','Notes'],['handoutMasters','Handout master'],['theme','Theme']]; for (const [dir,label] of types) if (part.startsWith(`ppt/${dir}/`)) { if (dir === 'notesSlides') { for (const [slide,num] of slides) if (relations.get(slide)?.some(r => r.type === 'notesSlide' && r.target === part)) return `Notes for slide ${num}`; } return `${label} · ${part.split('/').pop()}`; } return `Other XML · ${part.split('/').pop()}`; }
  function themeParts(part: string, seen = new Set<string>()): string[] { if (seen.has(part) || seen.size > 12) return []; seen.add(part); const rels = relations.get(part) ?? []; const own = rels.filter(r => r.type === 'theme' || r.type === 'themeOverride').map(r => r.target); if (own.length) return own; return rels.filter(r => ['slideLayout','slideMaster','notesMaster','handoutMaster'].includes(r.type)).flatMap(r => themeParts(r.target, seen)); }
  function resolveToken(font: string, part: string): [string | null, string] {
    const cacheKey = part + '\0' + font; if (tokenCache.has(cacheKey)) return tokenCache.get(cacheKey)!;
    const m = /^\+(mj|mn)-(lt|ea|cs)$/.exec(font); if (!m) return [null, 'Unrecognized theme token'];
    const candidates = themeParts(part); const fonts = new Set<string>();
    for (const theme of candidates) {
      if (!zip.has(theme)) continue;
      if (!themeCache.has(theme)) {
        const values = new Map<string, Set<string>>();
        for (const scheme of all(parse(theme)).filter(e => dml(e) && ['majorFont','minorFont'].includes(e.localName))) {
          for (const child of elements(scheme)) if (dml(child) && ['latin','ea','cs'].includes(child.localName)) {
            const key = (scheme.localName === 'majorFont' ? 'mj' : 'mn') + '-' + (child.localName === 'latin' ? 'lt' : child.localName), value = child.getAttribute('typeface');
            if (value) { const fonts = values.get(key) ?? new Set<string>(); fonts.add(value); values.set(key,fonts); }
          }
        }
        themeCache.set(theme,values);
      }
      for (const value of themeCache.get(theme)?.get(m[1] + '-' + m[2]) ?? []) fonts.add(value);
    }
    const answer: [string | null, string] = fonts.size === 1 ? [Array.from(fonts)[0], `Theme declaration via ${candidates.join(', ')}; language-dependent fallback is not evaluated`] : [null, fonts.size > 1 ? 'Conflicting theme declarations; mapping unresolved' : 'No nonempty matching theme declaration; mapping unresolved']; tokenCache.set(cacheKey, answer); return answer;
  }
  const references: FontReference[] = []; let partsScanned = 0;
  // Scan every PPT XML part, including orphaned parts and hidden style declarations.
  for (const part of zip.keys()) if (part.startsWith('ppt/') && isXmlPart(part)) {
    partsScanned++; const doc = parse(part);
    for (const el of all(doc)) if (dml(el) && el.hasAttribute('typeface')) {
      const font = el.getAttribute('typeface') ?? ''; if (!font) continue;
      if (references.length >= LIMITS.refs) throw new ScanError('LIMITED', 'More than 30,000 font references; no complete report was produced.');
      let ancestor: Element | null = el, shape: Element | null = null, level: number | null = null, paragraph: Element | null = null, inStyle = false;
      while (ancestor) { if (dml(ancestor) && /^lvl[1-9]pPr$/.test(ancestor.localName)) level = Number(ancestor.localName[3]); if (dml(ancestor, 'pPr') && ancestor.hasAttribute('lvl')) level = Number(ancestor.getAttribute('lvl')) + 1; if (dml(ancestor,'p')) paragraph = ancestor; if (['lstStyle','txStyles','titleStyle','bodyStyle','otherStyle','defaultTextStyle'].includes(ancestor.localName)) inStyle = true; if (pml(ancestor) && ['sp','pic','graphicFrame','cxnSp'].includes(ancestor.localName) && !shape) shape = ancestor; ancestor = ancestor.parentElement; }
      if (shape && !shapeCache.has(shape)) { const children=all(shape); shapeCache.set(shape,{nv:children.find(e=>pml(e,'cNvPr')),ph:children.find(e=>pml(e,'ph'))}); }
      const meta=shape ? shapeCache.get(shape) : null, nv=meta?.nv, ph=meta?.ph;
      if (paragraph && !textCache.has(paragraph)) textCache.set(paragraph, all(paragraph).filter(e => dml(e,'t')).map(e => e.textContent ?? '').join('').slice(0,240));
      const text = paragraph ? textCache.get(paragraph)! : null;
      const token = font.startsWith('+'); const [resolvedFont, resolution] = token ? resolveToken(font,part) : [null, 'Explicit declaration; effective inheritance and font availability are not evaluated'];
      references.push({ id: references.length + 1, font, kind: token ? 'theme token' : 'explicit', resolvedFont, resolution, part, location: location(part), path: paths.get(el)! + '/@typeface', shape: nv ? `${nv.getAttribute('name') || 'Unnamed shape'} (id ${nv.getAttribute('id') || '?'})` : null, placeholder: ph ? `${ph.getAttribute('type') || 'body'} (index ${ph.getAttribute('idx') || '0'})` : null, listLevel: level, context: inStyle ? 'Style declaration (may be unused or apply to empty text)' : paragraph ? (text ? 'Text paragraph' : 'Empty paragraph') : part.includes('/theme/') ? 'Theme font declaration' : 'Font declaration', script: el.getAttribute('script') || (el.localName === 'latin' ? 'Latin' : el.localName === 'ea' ? 'East Asian' : el.localName === 'cs' ? 'Complex script' : el.localName === 'buFont' ? 'Bullet' : el.localName), text });
    }
  }
  warnings.add('Locations are stored declarations, including unused styles and orphaned parts. They do not prove the font is visible, installed, missing, embedded, or selected during rendering.');
  warnings.add('Theme mappings follow package relationships where available. Language-specific fallback, inheritance, theme overrides with conflicts, charts, diagrams, embedded objects, and actual rendering are not fully evaluated.');
  return { version: 1, fileName, status: 'COMPLETE', scope: 'Nonempty DrawingML @typeface declarations in PPT XML parts identified by content type or XML extension; canonical a/p namespace breadcrumbs', references, partsScanned, entries: zip.size, warnings: [...warnings] };
}
export function filterReferences(report: ScanReport, query: string): FontReference[] { const q = query.trim().toLocaleLowerCase(); return report.references.filter(r => !q || r.font.toLocaleLowerCase().includes(q) || r.resolvedFont?.toLocaleLowerCase().includes(q)); }
export function csvReport(refs: FontReference[]): string { const columns: (keyof FontReference)[] = ['font','kind','resolvedFont','location','shape','placeholder','listLevel','context','script','text','part','path','resolution']; const cell = (value: unknown) => { let s = String(value ?? ''); if (/^[\s]*[=+@-]/.test(s)) s = "'" + s; return '"' + s.replaceAll('"', '""') + '"'; }; return [columns.join(','), ...refs.map(r => columns.map(c => cell(r[c])).join(','))].join('\r\n'); }
