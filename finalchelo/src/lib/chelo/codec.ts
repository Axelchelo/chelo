import { OP_TYPE, type Ins, type Proto } from "@/lib/chelo/ir";
import { sha256 } from "@/lib/chelo/sha256";
import type { Settings } from "@/lib/chelo/settings";

const MAGIC = new Uint8Array([67, 72, 76, 79, 86, 49, 52, 0]); // CHLOV14\0

function u32(n: number): Uint8Array {
  const b = new Uint8Array(4);
  new DataView(b.buffer).setUint32(0, n >>> 0, true);
  return b;
}

function concat(parts: Uint8Array[]): Uint8Array {
  let n = 0;
  for (const p of parts) n += p.length;
  const o = new Uint8Array(n);
  let i = 0;
  for (const p of parts) {
    o.set(p, i);
    i += p.length;
  }
  return o;
}

function xorBytes(data: Uint8Array, key: Uint8Array, salt: number): Uint8Array {
  const o = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) o[i] = data[i] ^ key[(i + salt) % key.length];
  return o;
}

function pack(layout: Record<string, { Start: number; Length: number }>, values: Record<string, number>) {
  let out = 0;
  for (const [name, spec] of Object.entries(layout)) {
    const mask = (2 ** spec.Length) - 1;
    const raw = Math.trunc(values[name] ?? 0);
    const v = raw < 0 ? (raw + 2 ** spec.Length) & mask : raw & mask;
    out += v * 2 ** spec.Start;
  }
  return out >>> 0;
}

function f64le(n: number): Uint8Array {
  const b = new Uint8Array(8);
  new DataView(b.buffer).setFloat64(0, n, true);
  return b;
}

export function encodeChunk(chunk: Proto, settings: Settings): Uint8Array {
  const key = Uint8Array.from(settings.Key);
  const body = writeChunk(chunk, settings, key);
  return concat([
    MAGIC,
    new Uint8Array([14, 1]),
    u32(settings.Seed),
    u32(body.length),
    body,
    sha256(body),
  ]);
}

function writeChunk(c: Proto, s: Settings, key: Uint8Array): Uint8Array {
  const sections: Record<string, Uint8Array> = {
    UpvalCount: new Uint8Array([c.upvalCount & 255]),
    ParameterCount: new Uint8Array([c.parameterCount & 255]),
    VarargCount: new Uint8Array([c.varargCount & 255]),
    Constants: writeConstants(c, s, key),
    Instructions: writeInstructions(c, s),
    Prototypes: writeProtos(c, s, key),
  };
  const parts: Uint8Array[] = [u32(s.ChunkStructure.length)];
  for (const name of s.ChunkStructure) {
    const raw = new TextEncoder().encode(name);
    const data = sections[name];
    parts.push(new Uint8Array([raw.length]), raw, u32(data.length), data);
  }
  return concat(parts);
}

function writeConstants(c: Proto, s: Settings, key: Uint8Array): Uint8Array {
  const parts: Uint8Array[] = [u32(c.constants.length)];
  c.constants.forEach((k, i) => {
    parts.push(new Uint8Array([s.ConstantTags[k.type] & 255]));
    if (k.type === "Nil") return;
    if (k.type === "Boolean") {
      parts.push(new Uint8Array([k.data ? 1 : 0]));
      return;
    }
    if (k.type === "Number") {
      const raw = f64le(Number(k.data));
      parts.push(u32(8), xorBytes(raw, key, i));
      return;
    }
    const raw = new TextEncoder().encode(String(k.data));
    const step = Math.max(1, ((i * 7) % 4) + 1);
    const slices: Uint8Array[] = [];
    for (let j = 0; j < raw.length; j += step) slices.push(raw.subarray(j, j + step));
    parts.push(u32(slices.length));
    slices.forEach((p, j) => {
      const e = xorBytes(p, key, i + j);
      parts.push(u32(e.length), e);
    });
  });
  return concat(parts);
}

function wordFor(ins: { op: Ins["op"]; a: number; b: number; c: number }, s: Settings, oid: number) {
  const typ = OP_TYPE[ins.op];
  const layout = (s.Registers as Record<string, Settings["Registers"]["ABC"]>)[typ] ?? s.Registers.ABC;
  const mode = typ === "ABC" ? 0 : typ === "ABx" ? 1 : typ === "AsBx" ? 2 : 3;
  return u32(pack(layout, { A: ins.a, B: ins.b, C: ins.c, Mode: mode, Enum: oid & 7 }));
}

function writeInstructions(c: Proto, s: Settings): Uint8Array {
  const parts: Uint8Array[] = [u32(c.instructions.length)];
  for (const ins of c.instructions) {
    const oid = s.OpcodeMap[ins.op];
    parts.push(u32(oid), wordFor(ins, s, oid), new Uint8Array([ins.junk ? 1 : 0]));
    if (ins.op === "Super") {
      const subs = ins.superOps ?? [];
      parts.push(u32(subs.length));
      for (const sub of subs) {
        const soid = s.OpcodeMap[sub.op];
        parts.push(u32(soid), wordFor({ op: sub.op, a: sub.a, b: sub.b, c: sub.c }, s, soid));
      }
    }
  }
  return concat(parts);
}

function writeProtos(c: Proto, s: Settings, key: Uint8Array): Uint8Array {
  const parts: Uint8Array[] = [u32(c.prototypes.length)];
  for (const p of c.prototypes) {
    const body = writeChunk(p, s, key);
    parts.push(u32(body.length), body);
  }
  return concat(parts);
}
