import { encodeChunk } from "@/lib/chelo/codec";
import { compileLua } from "@/lib/chelo/compile";
import { deserializeLuac } from "@/lib/chelo/deserialize";
import { generateLua, protoStats } from "@/lib/chelo/generate";
import { finalizeJumps, linkJumps, markBinds } from "@/lib/chelo/ir";
import { fuseSuper, insertJunk, stripLines } from "@/lib/chelo/passes";
import { buildSettings } from "@/lib/chelo/settings";
import { skinLua } from "@/lib/chelo/skin";

export interface ObfuscateOptions {
  seed?: number | null;
  antiLevel?: number;
  junkEvery?: number;
  superops?: boolean;
}

export interface ObfuscateMeta {
  seed: number;
  antiLevel: number;
  junkEvery: number;
  superops: boolean;
  payloadBytes: number;
  outputBytes: number;
  instructions: number;
  constants: number;
  prototypes: number;
  source: "lua" | "luac";
}

export interface ObfuscateResult {
  lua: string;
  meta: ObfuscateMeta;
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

export function obfuscate(input: string | Uint8Array, options: ObfuscateOptions = {}): ObfuscateResult {
  const antiLevel = clamp(options.antiLevel ?? 2, 0, 3);
  const junkEvery = clamp(options.junkEvery ?? 5, 0, 50);
  const superops = options.superops !== false;
  let seed = options.seed;
  if (seed == null || Number.isNaN(seed)) {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    seed = buf[0];
  }
  seed = seed >>> 0;

  let source: "lua" | "luac" = "lua";
  let proto;
  if (input instanceof Uint8Array) {
    source = "luac";
    proto = deserializeLuac(input);
    linkJumps(proto);
  } else {
    const text = input.replace(/^\uFEFF/, "");
    if (!text.trim()) throw new Error("Pega código Lua o sube un .lua / .luac");
    proto = compileLua(text);
  }

  markBinds(proto);
  stripLines(proto);
  if (junkEvery > 0) insertJunk(proto, junkEvery);
  if (superops) fuseSuper(proto);
  finalizeJumps(proto);

  const settings = buildSettings(seed);
  const payload = encodeChunk(proto, settings);
  const lua = skinLua(generateLua(payload, settings, antiLevel), seed);
  const stats = protoStats(proto);
  return {
    lua,
    meta: {
      seed,
      antiLevel,
      junkEvery,
      superops,
      payloadBytes: payload.length,
      outputBytes: lua.length,
      ...stats,
      source,
    },
  };
}
