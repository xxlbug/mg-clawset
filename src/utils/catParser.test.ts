import { describe, it, expect } from 'vitest';
import { lz4DecompressBlock } from './lz4';
import { parseHouseState, parseAdventureKeys, parseCatClass } from './catParser';

describe('lz4DecompressBlock', () => {
  it('handles a literal-only block', () => {
    // token 0x30 = 3 literals, no match; last sequence ends after literals.
    const src = new Uint8Array([0x30, 0x41, 0x42, 0x43]);
    const out = lz4DecompressBlock(src, 3);
    expect(Array.from(out)).toEqual([0x41, 0x42, 0x43]);
  });

  it('expands a back-reference match (offset 1)', () => {
    // 1 literal 'A', then match offset=1 len=7 -> "AAAAAAAA"
    const src = new Uint8Array([0x13, 0x41, 0x01, 0x00]);
    const out = lz4DecompressBlock(src, 8);
    expect(new TextDecoder().decode(out)).toBe('AAAAAAAA');
  });

  it('handles extended literal lengths (>=15)', () => {
    // high nibble 15 + extra byte 5 => 20 literals, no match
    const lits = Array.from({ length: 20 }, (_, i) => i + 1);
    const src = new Uint8Array([0xf0, 5, ...lits]);
    const out = lz4DecompressBlock(src, 20);
    expect(Array.from(out)).toEqual(lits);
  });
});

function u32(view: DataView, off: number, v: number) { view.setUint32(off, v, true); }

describe('parseHouseState', () => {
  it('maps cat keys to room names', () => {
    const room = 'Attic';
    const buf = new Uint8Array(8 + 8 + 8 + room.length + 24);
    const view = new DataView(buf.buffer);
    u32(view, 0, 0);     // version
    u32(view, 4, 1);     // count
    u32(view, 8, 42);    // catKey (then 4 pad -> +8)
    u32(view, 16, room.length); // roomLen (then 4 pad -> +8)
    new TextEncoder().encodeInto(room, buf.subarray(24));
    const map = parseHouseState(buf);
    expect(map.get(42)).toBe('Attic');
  });

  it('returns empty for a too-short blob', () => {
    expect(parseHouseState(new Uint8Array(4)).size).toBe(0);
  });
});

describe('parseAdventureKeys', () => {
  it('reads the high 32 bits of each 8-byte entry as the cat key', () => {
    const buf = new Uint8Array(8 + 8);
    const view = new DataView(buf.buffer);
    u32(view, 0, 0);   // version
    u32(view, 4, 1);   // count
    u32(view, 8, 0);   // low (unused)
    u32(view, 12, 99); // high = cat key
    const keys = parseAdventureKeys(buf);
    expect(keys.has(99)).toBe(true);
  });
});

describe('parseCatClass', () => {
  // Build a blob whose class string (u32 len + u32 zero + utf-8) ends exactly
  // 115 bytes before the end, matching the in-game layout.
  function blobWithClass(name: string): Uint8Array {
    const enc = new TextEncoder().encode(name);
    const buf = new Uint8Array(8 + enc.length + 115);
    const view = new DataView(buf.buffer);
    u32(view, 0, enc.length); // length prefix
    u32(view, 4, 0);          // zero pad
    buf.set(enc, 8);          // name; string ends at 8+len, then 115 tail bytes
    return buf;
  }

  it('reads the class name from the fixed tail offset', () => {
    const buf = blobWithClass('Necromancer');
    expect(parseCatClass(buf, new DataView(buf.buffer))).toBe('Necromancer');
  });

  it('treats "Colorless" as classless', () => {
    const buf = blobWithClass('Colorless');
    expect(parseCatClass(buf, new DataView(buf.buffer))).toBe('');
  });

  it('returns empty when no class prefix is present', () => {
    const buf = new Uint8Array(150); // all zeros, no valid length/zero prefix
    expect(parseCatClass(buf, new DataView(buf.buffer))).toBe('');
  });
});
