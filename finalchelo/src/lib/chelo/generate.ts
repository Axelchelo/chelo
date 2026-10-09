import { OPCODES, type Proto } from "@/lib/chelo/ir";
import { ANTI_DUMP, ANTI_HOOK, VM_DESER, VM_START, VM_WRAP } from "@/lib/chelo/runtime";
import type { Settings } from "@/lib/chelo/settings";

function luaValue(v: unknown): string {
  if (typeof v === "string") {
    return `"${v.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n").replace(/\r/g, "\\r")}"`;
  }
  if (typeof v === "boolean") return v ? "true" : "false";
  if (v == null) return "nil";
  if (typeof v === "number") {
    if (!Number.isFinite(v)) throw new Error("Número no finito en el runtime");
    return Number.isInteger(v) ? String(v) : String(v);
  }
  if (Array.isArray(v)) return `{${v.map(luaValue).join(",")}}`;
  if (typeof v === "object") {
    return `{${Object.entries(v as Record<string, unknown>)
      .map(([k, val]) => `[${luaValue(k)}]=${luaValue(val)}`)
      .join(",")}}`;
  }
  throw new Error("Valor no serializable");
}

function bytesToB64(bytes: Uint8Array): string {
  let bin = "";
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) {
    bin += String.fromCharCode(...bytes.subarray(i, Math.min(i + step, bytes.length)));
  }
  return btoa(bin);
}

const BOOT = `
local function _die()
    error("Chelo Obfuscator: output validation failed", 0)
end

local function _run_module(b64)
    local src = _base64(b64)
    local loader = loadstring or load
    local fn = loader(src)
    if not fn then _die() end
    local ok, mod = pcall(fn)
    if not ok or type(mod) ~= "table" or type(mod.run) ~= "function" then _die() end
    if not pcall(mod.run, _AntiLevel) then _die() end
end

if _AntiLevel and _AntiLevel > 0 then
    _run_module(_AntiHookB64)
end

if _AntiLevel and _AntiLevel > 0 then
    _run_module(_AntiDumpB64)
end

local function _boot(raw)
    if type(raw) ~= "string" or #raw < 16 then _die() end
    if raw:sub(1, 8) ~= "CHLOV14\\0" then _die() end
    local p = 9
    local ver = Byte(raw, p)
    local endian = Byte(raw, p + 1)
    p = p + 2
    if ver ~= V14.Version or endian ~= 1 then _die() end
    local seed
    seed, p = _read32(raw, p)
    local n
    n, p = _read32(raw, p)
    if p + n + 32 - 1 ~= #raw then _die() end
    local body = raw:sub(p, p + n - 1)
    local digest = raw:sub(p + n, p + n + 31)
    if _sha256(body) ~= digest then _die() end
    return Deserialize(body)
end

local _raw = _base64(ObfuscatorBytecode)
local _chunk = _boot(_raw)
return function(...)
    return Wrap(_chunk, _ENV or _G, {}, ...)
end
`;

export function generateLua(payload: Uint8Array, settings: Settings, antiLevel: number): string {
  const encoded = bytesToB64(payload);
  const anti = bytesToB64(new TextEncoder().encode(ANTI_DUMP));
  const hook = bytesToB64(new TextEncoder().encode(ANTI_HOOK));
  const runtime = `local V14=${luaValue({
    Version: settings.Version,
    Seed: settings.Seed,
    OpcodeMap: settings.OpcodeMap,
    Registers: settings.Registers,
    ConstantTags: settings.ConstantTags,
    Key: settings.Key,
    OpcodeTypes: Object.fromEntries(OPCODES.map((op) => [op, settings.OpcodeTypes[op]])),
  })}`;
  const body = VM_START.replace("|OBFUSCATOR_BYTECODE|", `[=[${encoded}]=]`).replace("|V14_RUNTIME|", runtime);
  const inject = `\nlocal _AntiDumpB64 = [=[${anti}]=]\nlocal _AntiHookB64 = [=[${hook}]=]\nlocal _AntiLevel = ${antiLevel | 0}\n`;
  return body + inject + "\n" + VM_DESER + "\n" + VM_WRAP + "\n" + BOOT;
}

export function protoStats(fn: Proto): { instructions: number; constants: number; prototypes: number } {
  let instructions = fn.instructions.length;
  let constants = fn.constants.length;
  let prototypes = fn.prototypes.length;
  for (const p of fn.prototypes) {
    const s = protoStats(p);
    instructions += s.instructions;
    constants += s.constants;
    prototypes += s.prototypes;
  }
  return { instructions, constants, prototypes };
}
