import { Inflate } from 'fflate';
export const LIMITS = { fileBytes: 40 * 1024 * 1024, entries: 3000, entryBytes: 8 * 1024 * 1024, totalBytes: 80 * 1024 * 1024, xmlBytes: 2 * 1024 * 1024, xmlTotalBytes: 16 * 1024 * 1024, nodes: 200000, depth: 100, refs: 30000 };
export class ScanError extends Error { constructor(public code: 'UNSUPPORTED' | 'LIMITED' | 'INVALID', message: string) { super(message); } }
function fail(message: string): never { throw new ScanError('INVALID', message); }
const table = Array.from({ length: 256 }, (_, n) => { for (let i = 0; i < 8; i++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1; return n >>> 0; });
function crc(data: Uint8Array) { let c = 0xffffffff; for (const b of data) c = table[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
export function readZip(bytes: Uint8Array): Map<string, Uint8Array> {
  if (bytes.length > LIMITS.fileBytes) throw new ScanError('LIMITED', 'File exceeds the 40 MiB input limit.');
  if (bytes[0] === 0xd0 && bytes[1] === 0xcf) throw new ScanError('UNSUPPORTED', 'Encrypted Office files and legacy .ppt files are unsupported. Save an unencrypted .pptx copy in PowerPoint.');
  if (bytes.length < 22) fail('This is not a readable PPTX ZIP package.');
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) if (v.getUint32(i, true) === 0x06054b50 && i + 22 + v.getUint16(i + 20, true) === bytes.length) { end = i; break; }
  if (end < 0) fail('ZIP directory is missing or damaged.');
  if (v.getUint16(end + 4, true) || v.getUint16(end + 6, true)) throw new ScanError('UNSUPPORTED', 'Split ZIP packages are unsupported.');
  const count = v.getUint16(end + 10, true), cdSize = v.getUint32(end + 12, true), cdStart = v.getUint32(end + 16, true);
  if (count === 65535 || cdSize === 0xffffffff || cdStart === 0xffffffff) throw new ScanError('UNSUPPORTED', 'ZIP64 packages are unsupported.');
  if (v.getUint16(end + 8, true) !== count || cdStart + cdSize !== end) fail('ZIP directory bounds are inconsistent.');
  if (count > LIMITS.entries) throw new ScanError('LIMITED', 'Package exceeds the 3,000-entry limit.');
  const result = new Map<string, Uint8Array>(); let pos = cdStart, total = 0;
  for (let n = 0; n < count; n++) {
    if (pos + 46 > end || v.getUint32(pos, true) !== 0x02014b50) fail('ZIP directory entry is damaged.');
    const flags = v.getUint16(pos + 8, true), method = v.getUint16(pos + 10, true), checksum = v.getUint32(pos + 16, true), packed = v.getUint32(pos + 20, true), size = v.getUint32(pos + 24, true), nl = v.getUint16(pos + 28, true), el = v.getUint16(pos + 30, true), cl = v.getUint16(pos + 32, true), local = v.getUint32(pos + 42, true);
    if (pos + 46 + nl + el + cl > end) fail('ZIP filename or metadata runs outside its directory.');
    const nameBytes = bytes.subarray(pos + 46, pos + 46 + nl); const name = new TextDecoder('utf-8', { fatal: true }).decode(nameBytes);
    if (flags & 1) throw new ScanError('UNSUPPORTED', 'Encrypted ZIP entries are unsupported.');
    if (method !== 0 && method !== 8) throw new ScanError('UNSUPPORTED', 'Only stored and deflated ZIP entries are supported.');
    if (v.getUint16(pos + 34, true) !== 0 || size === 0xffffffff || packed === 0xffffffff || local === 0xffffffff) throw new ScanError('UNSUPPORTED', 'ZIP64 or split entries are unsupported.');
    if (size > LIMITS.entryBytes || total + size > LIMITS.totalBytes) throw new ScanError('LIMITED', 'Package exceeds the 8 MiB per-entry or 80 MiB expanded-size limit.');
    total += size;
    if (!name || name.includes('\\') || name.startsWith('/') || name.split('/').includes('..') || result.has(name)) fail('ZIP contains an unsafe or duplicate part name.');
    if (local + 30 > cdStart || v.getUint32(local, true) !== 0x04034b50) fail('ZIP local header is damaged.');
    const lnl = v.getUint16(local + 26, true), lel = v.getUint16(local + 28, true), start = local + 30 + lnl + lel;
    if (v.getUint16(local + 6, true) !== flags || v.getUint16(local + 8, true) !== method || lnl !== nl || nameBytes.some((b, i) => bytes[local + 30 + i] !== b) || start + packed > cdStart) fail('ZIP local header disagrees with its directory.');
    let data: Uint8Array;
    if (method === 0) { if (packed !== size) fail('Stored ZIP entry has inconsistent size.'); data = bytes.slice(start, start + packed); }
    else {
      data = new Uint8Array(size); let offset = 0;
      const stream = new Inflate(chunk => { if (offset + chunk.length > size) throw new ScanError('LIMITED', 'Expanded ZIP entry exceeds its declared size.'); data.set(chunk, offset); offset += chunk.length; });
      try { for (let i = 0; i < packed; i += 1024) stream.push(bytes.subarray(start + i, start + Math.min(i + 1024, packed)), i + 1024 >= packed); }
      catch (e) { if (e instanceof ScanError) throw e; fail('A compressed ZIP entry is damaged.'); }
      if (offset !== size) fail('Expanded ZIP entry size disagrees with its directory.');
    }
    if (crc(data) !== checksum) fail('ZIP checksum failed. The file may be damaged.');
    result.set(name, data); pos += 46 + nl + el + cl;
  }
  if (pos !== end) fail('ZIP directory has unrecognized trailing data.');
  return result;
}
