import initSqlJs from 'sql.js';
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url';

export interface HouseInfo {
  atticUnlocked: boolean;
  /** Number of unlocked regular rooms (1-4). */
  regularRooms: number;
}

export interface SavegameParseResult {
  ownership: Record<string, number>;
  matched: number;
  unmatchedNames: string[];
  houseInfo: HouseInfo | null;
}

/**
 * files.house_unlocks blob: int32 version, then length-prefixed (int64) strings:
 * current house name followed by a count and that many unlock entries, e.g.
 * "Default", "SmallHouse_Attic", "MediumHouse", "MediumHouse_SmallRoom".
 * Every non-attic entry corresponds to one unlocked regular room.
 */
function parseHouseUnlocks(blob: Uint8Array): HouseInfo | null {
  try {
    const view = new DataView(blob.buffer, blob.byteOffset, blob.byteLength);
    const decoder = new TextDecoder('utf-8');
    let off = 4; // version
    const readStr = (): string => {
      const len = Number(view.getBigInt64(off, true));
      off += 8;
      const str = decoder.decode(blob.slice(off, off + len));
      off += len;
      return str;
    };
    readStr(); // current house name, e.g. "House2"
    const count = Number(view.getBigInt64(off, true));
    off += 8;
    if (count < 0 || count > 32) return null;
    const entries: string[] = [];
    for (let i = 0; i < count; i++) entries.push(readStr());
    const atticUnlocked = entries.some((e) => e.toLowerCase().includes('attic'));
    const regularRooms = Math.min(4, Math.max(1, entries.filter((e) => !e.toLowerCase().includes('attic')).length));
    return { atticUnlocked, regularRooms };
  } catch {
    return null;
  }
}

function parseFurnitureBlob(uint8Array: Uint8Array): { furniture_name: string; quality: number } {
  const view = new DataView(uint8Array.buffer, uint8Array.byteOffset, uint8Array.byteLength);
  const decoder = new TextDecoder('utf-8');
  let off = 0;
  off += 4; // field1
  const name_len = view.getInt32(off, true);
  off += 4;
  off += 4; // padding
  const nameBytes = uint8Array.slice(off, off + name_len);
  const furniture_name = decoder.decode(nameBytes);
  off += name_len;
  // Quality/rarity field sits right after the name string (0 = normal, 2 = rare)
  const quality = view.getInt32(off, true);
  return { furniture_name, quality };
}

/** Parse a Mewgenics .sav (SQLite) into ownership counts keyed by app furniture id. */
export async function parseSavegame(
  data: Uint8Array,
  furnitureIdMap: Map<string, string>,
): Promise<SavegameParseResult> {
  const SQL = await initSqlJs({
    locateFile: () => sqlWasmUrl,
  });

  const db = new SQL.Database(data);
  const itemCounts: { name: string; quality: number }[] = [];
  let houseInfo: HouseInfo | null = null;
  try {
    const stmt = db.prepare('SELECT key, data FROM furniture');
    while (stmt.step()) {
      const row = stmt.getAsObject();
      const blobData = row.data as Uint8Array;
      try {
        const parsed = parseFurnitureBlob(blobData);
        itemCounts.push({ name: parsed.furniture_name, quality: parsed.quality });
      } catch {
        // skip unparseable rows
      }
    }
    stmt.free();

    try {
      const hs = db.prepare("SELECT data FROM files WHERE key = 'house_unlocks'");
      if (hs.step()) {
        houseInfo = parseHouseUnlocks(hs.getAsObject().data as Uint8Array);
      }
      hs.free();
    } catch {
      // older saves / synthetic files may lack the files table
    }
  } finally {
    db.close();
  }

  // Aggregate counts per resolved name (base name or rare variant)
  const nameCounts: Record<string, number> = {};
  for (const { name, quality } of itemCounts) {
    // quality 0 = normal, 2 = rare
    const resolvedName = quality >= 2 ? `${name}_(Rare)` : name;
    nameCounts[resolvedName] = (nameCounts[resolvedName] || 0) + 1;
  }

  // Map save file names to app IDs
  const ownership: Record<string, number> = {};
  let matched = 0;
  const unmatchedNames: string[] = [];

  for (const [name, count] of Object.entries(nameCounts)) {
    const id = furnitureIdMap.get(name.toLowerCase());
    if (id) {
      ownership[id] = (ownership[id] || 0) + count;
      matched++;
    } else {
      unmatchedNames.push(name);
    }
  }

  return { ownership, matched, unmatchedNames, houseInfo };
}
