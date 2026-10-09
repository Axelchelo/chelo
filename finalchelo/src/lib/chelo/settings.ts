import { OPCODES, OP_TYPE, type OpName } from "@/lib/chelo/ir";
import { sha256 } from "@/lib/chelo/sha256";

export interface BitSpec {
  Start: number;
  Length: number;
}

export interface Settings {
  Version: number;
  Seed: number;
  OpcodeMap: Record<OpName, number>;
  Registers: {
    ABC: Record<string, BitSpec>;
    ABx: Record<string, BitSpec>;
    AsBx: Record<string, BitSpec>;
  };
  ConstantTags: Record<"Nil" | "Boolean" | "Number" | "String", number>;
  Key: number[];
  ChunkStructure: string[];
  OpcodeTypes: Record<OpName, string>;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(rng: () => number, items: T[]): T[] {
  const arr = items.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

function layout(rng: () => number, fields: [string, number][]): Record<string, BitSpec> {
  const order = shuffle(rng, fields);
  const out: Record<string, BitSpec> = {};
  let pos = 0;
  for (const [name, length] of order) {
    out[name] = { Start: pos, Length: length };
    pos += length;
  }
  return out;
}

export function buildSettings(seed: number): Settings {
  const s = seed >>> 0;
  const rng = mulberry32(s);
  const ids = shuffle(rng, OPCODES.map((_, i) => i));
  const OpcodeMap = {} as Record<OpName, number>;
  OPCODES.forEach((op, i) => {
    OpcodeMap[op] = ids[i];
  });
  const hex = s.toString(16).padStart(8, "0");
  const key = Array.from(sha256(new TextEncoder().encode(`chelo-v14:${hex}`)));
  const tags = ["Nil", "Boolean", "Number", "String"] as const;
  const ConstantTags = {} as Settings["ConstantTags"];
  for (const tag of tags) ConstantTags[tag] = 1 + Math.floor(rng() * 249);
  const OpcodeTypes = {} as Record<OpName, string>;
  for (const op of OPCODES) OpcodeTypes[op] = OP_TYPE[op];
  return {
    Version: 14,
    Seed: s,
    OpcodeMap,
    Registers: {
      ABC: layout(rng, [["A", 8], ["B", 9], ["C", 9], ["Mode", 3], ["Enum", 3]]),
      ABx: layout(rng, [["A", 8], ["B", 18], ["Mode", 3], ["Enum", 3]]),
      AsBx: layout(rng, [["A", 8], ["B", 18], ["Mode", 3], ["Enum", 3]]),
    },
    ConstantTags,
    Key: key,
    ChunkStructure: shuffle(rng, [
      "UpvalCount",
      "ParameterCount",
      "VarargCount",
      "Constants",
      "Instructions",
      "Prototypes",
    ]),
    OpcodeTypes,
  };
}
