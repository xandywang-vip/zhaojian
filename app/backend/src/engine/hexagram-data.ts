import fs from 'node:fs';
import path from 'node:path';

export interface HexagramRecord {
  id: number;
  name: string;
  upper: string;
  lower: string;
  guaCi: string;
  yaoCi: string[];
  imageText: string;
  keywords: string[];
}

let cache: Map<number, HexagramRecord> | null = null;

function locateDataFile(): string {
  const candidates = [
    path.resolve(__dirname, '../../data/gua-data.json'),
    path.resolve(__dirname, '../../../data/gua-data.json'),
    path.resolve(process.cwd(), 'data/gua-data.json'),
    path.resolve(process.cwd(), 'backend/data/gua-data.json'),
  ];
  for (const file of candidates) {
    if (fs.existsSync(file)) return file;
  }
  throw new Error(`gua-data.json not found. Searched: ${candidates.join(', ')}`);
}

export function loadAllRecords(): Map<number, HexagramRecord> {
  if (cache) return cache;
  const raw = fs.readFileSync(locateDataFile(), 'utf8');
  const list: HexagramRecord[] = JSON.parse(raw);
  cache = new Map(list.map((r) => [r.id, r]));
  return cache;
}

export function loadHexagramRecord(id: number): HexagramRecord {
  const map = loadAllRecords();
  const rec = map.get(id);
  if (!rec) throw new Error(`Hexagram record not found for id=${id}`);
  return rec;
}
