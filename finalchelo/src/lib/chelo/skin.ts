import { parse } from "luaparse";

const KEYWORDS = new Set([
  "and",
  "break",
  "do",
  "else",
  "elseif",
  "end",
  "false",
  "for",
  "function",
  "goto",
  "if",
  "in",
  "local",
  "nil",
  "not",
  "or",
  "repeat",
  "return",
  "then",
  "true",
  "until",
  "while",
  "continue",
]);

const ENV = new Set([
  "_G",
  "_ENV",
  "_VERSION",
  "self",
  "arg",
  "assert",
  "error",
  "warn",
  "pcall",
  "xpcall",
  "type",
  "typeof",
  "tostring",
  "tonumber",
  "select",
  "unpack",
  "next",
  "pairs",
  "ipairs",
  "rawget",
  "rawset",
  "rawequal",
  "setmetatable",
  "getmetatable",
  "getfenv",
  "setfenv",
  "load",
  "loadstring",
  "loadfile",
  "dofile",
  "require",
  "print",
  "newproxy",
  "collectgarbage",
  "table",
  "string",
  "math",
  "os",
  "io",
  "debug",
  "coroutine",
  "utf8",
  "bit32",
  "buffer",
  "task",
  "game",
  "workspace",
  "script",
  "Instance",
  "Vector2",
  "Vector3",
  "CFrame",
  "Color3",
  "Enum",
  "UDim2",
  "BrickColor",
  "Ray",
  "OverlapParams",
  "hookmetamethod",
  "getnamecallmethod",
  "hookfunction",
  "newcclosure",
  "checkcaller",
  "getrawmetatable",
]);

type Tok = { kind: "keyword" | "ident" | "number" | "string" | "op"; text: string };

type AstNode = {
  type: string;
  range?: [number, number];
  name?: string;
  isLocal?: boolean;
  value?: unknown;
  raw?: string;
  [key: string]: unknown;
};

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function walk(
  node: unknown,
  parent: AstNode | null,
  key: string,
  visit: (node: AstNode, parent: AstNode | null, key: string) => void,
) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const item of node) walk(item, parent, key, visit);
    return;
  }
  const ast = node as AstNode;
  if (typeof ast.type !== "string") return;
  visit(ast, parent, key);
  for (const childKey of Object.keys(ast)) {
    if (childKey === "range" || childKey === "loc") continue;
    const child = ast[childKey];
    if (child && typeof child === "object") walk(child, ast, childKey, visit);
  }
}

function readLongBracket(src: string, i: number): { contentStart: number; end: string } | null {
  if (src[i] !== "[") return null;
  let j = i + 1;
  while (src[j] === "=") j += 1;
  if (src[j] !== "[") return null;
  const eq = j - (i + 1);
  return { contentStart: j + 1, end: `]${"=".repeat(eq)}]` };
}

function readNumberEnd(src: string, i: number) {
  let j = i;
  const c1 = src[j + 1] ?? "";
  if (src[j] === "0" && (c1 === "x" || c1 === "X" || c1 === "b" || c1 === "B")) {
    const bin = c1 === "b" || c1 === "B";
    j += 2;
    while (j < src.length) {
      const c = src[j];
      if (c === "_") {
        j += 1;
        continue;
      }
      if (bin ? c === "0" || c === "1" : /[0-9a-fA-F]/.test(c)) {
        j += 1;
        continue;
      }
      break;
    }
    return j;
  }
  while (j < src.length && /[0-9_]/.test(src[j])) j += 1;
  if (src[j] === "." && /[0-9]/.test(src[j + 1] ?? "")) {
    j += 1;
    while (j < src.length && /[0-9_]/.test(src[j])) j += 1;
  }
  if (src[j] === "e" || src[j] === "E") {
    let k = j + 1;
    if (src[k] === "+" || src[k] === "-") k += 1;
    if (/[0-9]/.test(src[k] ?? "")) {
      j = k + 1;
      while (j < src.length && /[0-9_]/.test(src[j])) j += 1;
    }
  }
  return j;
}

export function tokenizeLua(src: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    if (c === " " || c === "\t" || c === "\n" || c === "\r" || c === "\f" || c === "\v") {
      i += 1;
      continue;
    }
    if (c === "-" && src[i + 1] === "-") {
      i += 2;
      const lb = src[i] === "[" ? readLongBracket(src, i) : null;
      if (lb) {
        const end = src.indexOf(lb.end, lb.contentStart);
        if (end < 0) throw new Error("Comentario largo sin cerrar");
        i = end + lb.end.length;
      } else {
        while (i < n && src[i] !== "\n") i += 1;
      }
      continue;
    }
    if (c === "[") {
      const lb = readLongBracket(src, i);
      if (lb) {
        const end = src.indexOf(lb.end, lb.contentStart);
        if (end < 0) throw new Error("Cadena larga sin cerrar");
        out.push({ kind: "string", text: src.slice(i, end + lb.end.length) });
        i = end + lb.end.length;
        continue;
      }
    }
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < n) {
        if (src[j] === "\\") {
          j += 2;
          continue;
        }
        if (src[j] === c) {
          j += 1;
          break;
        }
        if (src[j] === "\n") throw new Error("Cadena sin cerrar");
        j += 1;
      }
      out.push({ kind: "string", text: src.slice(i, j) });
      i = j;
      continue;
    }
    if (c === "." && /[0-9]/.test(src[i + 1] ?? "")) {
      const j = readNumberEnd(src, i);
      out.push({ kind: "number", text: src.slice(i, j) });
      i = j;
      continue;
    }
    if (c >= "0" && c <= "9") {
      const j = readNumberEnd(src, i);
      out.push({ kind: "number", text: src.slice(i, j) });
      i = j;
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      let j = i + 1;
      while (j < n && /[A-Za-z0-9_]/.test(src[j])) j += 1;
      const text = src.slice(i, j);
      out.push({ kind: KEYWORDS.has(text) ? "keyword" : "ident", text });
      i = j;
      continue;
    }
    const three = src.slice(i, i + 3);
    if (three === "...") {
      out.push({ kind: "op", text: three });
      i += 3;
      continue;
    }
    const two = src.slice(i, i + 2);
    if (two === ".." || two === "==" || two === "~=" || two === "<=" || two === ">=" || two === "::") {
      out.push({ kind: "op", text: two });
      i += 2;
      continue;
    }
    out.push({ kind: "op", text: c });
    i += 1;
  }
  return out;
}

function wordish(kind: Tok["kind"]) {
  return kind === "keyword" || kind === "ident" || kind === "number";
}

export function minifyLua(src: string) {
  const tokens = tokenizeLua(src);
  let out = "";
  let prev: Tok["kind"] | null = null;
  for (const tok of tokens) {
    if (out && prev && wordish(prev) && wordish(tok.kind)) out += " ";
    out += tok.text;
    prev = tok.kind;
  }
  return out;
}

function unescapeLuaString(raw: string): string | null {
  if (raw.startsWith("[")) return null;
  const q = raw[0];
  if ((q !== '"' && q !== "'") || raw[raw.length - 1] !== q) return null;
  let i = 1;
  let out = "";
  const end = raw.length - 1;
  while (i < end) {
    if (raw[i] !== "\\") {
      out += raw[i];
      i += 1;
      continue;
    }
    i += 1;
    const c = raw[i] ?? "";
    i += 1;
    const simple: Record<string, string> = {
      a: "\u0007",
      b: "\b",
      f: "\f",
      n: "\n",
      r: "\r",
      t: "\t",
      v: "\v",
      "\\": "\\",
      '"': '"',
      "'": "'",
      "\n": "",
    };
    if (c in simple) {
      out += simple[c];
      continue;
    }
    if (c === "\r") {
      if (raw[i] === "\n") i += 1;
      continue;
    }
    if (c === "x") {
      const hex = raw.slice(i, i + 2);
      if (!/^[0-9a-fA-F]{2}$/.test(hex)) return null;
      out += String.fromCharCode(parseInt(hex, 16));
      i += 2;
      continue;
    }
    if (c === "z") {
      while (i < end && /[ \t\n\r\v\f]/.test(raw[i])) i += 1;
      continue;
    }
    if (c >= "0" && c <= "9") {
      let digits = c;
      for (let k = 0; k < 2 && raw[i] >= "0" && raw[i] <= "9"; k += 1) digits += raw[i++];
      out += String.fromCharCode(Number(digits) & 255);
      continue;
    }
    out += c;
  }
  return out;
}

function encodeLuaString(value: string, rng: () => number) {
  let out = "'";
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code > 255) return null;
    const roll = rng();
    if (roll < 0.18) out += "\\z ";
    if (code === 39 || code === 92 || code < 32 || code > 126 || roll < 0.72) {
      if (roll < 0.45) out += `\\x${code.toString(16).padStart(2, "0")}`;
      else if (roll > 0.88 && code < 128) out += `\\u{${code.toString(16)}}`;
      else out += `\\${code.toString().padStart(3, "0")}`;
    } else {
      out += value[i];
    }
  }
  out += "'";
  return out;
}

function sprinkle(digits: string, rng: () => number) {
  if (digits.length < 2) return digits;
  let out = digits[0];
  for (let i = 1; i < digits.length; i += 1) {
    const roll = rng();
    if (roll < 0.22) out += "__";
    else if (roll < 0.55) out += "_";
    out += digits[i];
  }
  if (rng() < 0.35) out += "__";
  return out;
}

function mangleInt(n: number, rng: () => number): string | null {
  if (!Number.isSafeInteger(n)) return null;
  const v = Math.abs(n);
  const roll = rng();
  const hexBody = () =>
    sprinkle(
      v
        .toString(16)
        .split("")
        .map((ch) => (rng() < 0.5 ? ch.toUpperCase() : ch))
        .join(""),
      rng,
    );
  let lit: string;
  if (v < 2 && roll < 0.25) lit = String(v);
  else if (roll < 0.62) {
    const prefix = rng() < 0.5 ? "0x" : "0X";
    const gap = rng() < 0.28 ? "_" : "";
    lit = prefix + gap + hexBody();
  } else if (v <= 0xffff) {
    const prefix = rng() < 0.5 ? "0b" : "0B";
    const gap = rng() < 0.28 ? "_" : "";
    lit = prefix + gap + sprinkle(v.toString(2), rng);
  } else {
    const prefix = rng() < 0.5 ? "0x" : "0X";
    lit = prefix + hexBody();
  }
  return lit;
}

function namePool(rng: () => number, forbidden: Set<string>) {
  const letters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const cands: string[] = [];
  for (const a of letters) cands.push(a);
  for (const a of letters) for (const b of letters) cands.push(a + b);
  for (let i = cands.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = cands[i];
    cands[i] = cands[j];
    cands[j] = tmp;
  }
  const usable = cands.filter((name) => !forbidden.has(name));
  let i = 0;
  return () => {
    const name = usable[i++];
    if (!name) throw new Error("Sin nombres libres para la salida");
    return name;
  };
}

function applyRanges(source: string, edits: { start: number; end: number; text: string }[]) {
  const sorted = edits.slice().sort((a, b) => b.start - a.start);
  let out = source;
  let cursor = source.length;
  for (const edit of sorted) {
    if (edit.end > cursor) throw new Error("Rangos solapados al compactar");
    out = out.slice(0, edit.start) + edit.text + out.slice(edit.end);
    cursor = edit.start;
  }
  return out;
}

function skeleton(src: string) {
  const tokens = tokenizeLua(src);
  let out = "";
  let prev: Tok["kind"] | null = null;
  for (const tok of tokens) {
    const text = tok.kind === "string" ? '"s"' : tok.kind === "number" ? "0" : tok.text;
    const kind = tok.kind === "string" ? "string" : tok.kind === "number" ? "number" : tok.kind;
    if (out && prev && wordish(prev) && wordish(kind)) out += " ";
    out += text;
    prev = kind;
  }
  return out;
}

const PREAMBLE =
  "return({x=table.create,CJ=bit32.bor,yJ=bit32,D=bit32.bnot,H=bit32.rrotate,s=bit32.bor,M=bit32,W=string.byte,E=string,h=bit32.countlz,Q=bit32.countrz,_=bit32.lshift,IJ=bit32.rshift,WJ=bit32.lrotate,lJ=bit32.bnot,oJ=bit32.rrotate,NJ=bit32.lshift,MJ=bit32.countrz,B=buffer,V=coroutine.yield,SJ=getmetatable,xJ=utf8,EJ=table,t=true,q=nil,K=function(w)";

export function skinLua(source: string, seed: number): string {
  const ast = parse(source, {
    ranges: true,
    scope: true,
    comments: false,
    luaVersion: "5.1",
  });
  const locals: string[] = [];
  const globals: string[] = [];
  const seenLocal = new Set<string>();
  const seenGlobal = new Set<string>();
  const idents: { start: number; end: number; name: string; local: boolean }[] = [];
  const seenRange = new Set<string>();

  walk(ast, null, "root", (node, parent, key) => {
    if (node.type !== "Identifier" || !node.range || node.name == null) return;
    if (parent?.type === "MemberExpression" && key === "identifier") return;
    if (parent?.type === "TableKeyString" && key === "key") return;
    if (node.isLocal == null) return;
    const id = `${node.range[0]}:${node.range[1]}`;
    if (seenRange.has(id)) return;
    seenRange.add(id);
    const local = node.isLocal === true;
    idents.push({ start: node.range[0], end: node.range[1], name: node.name, local });
    if (local) {
      if (!seenLocal.has(node.name)) {
        seenLocal.add(node.name);
        locals.push(node.name);
      }
    } else if (!ENV.has(node.name) && !seenGlobal.has(node.name)) {
      seenGlobal.add(node.name);
      globals.push(node.name);
    }
  });

  const forbidden = new Set<string>([...KEYWORDS, ...ENV, "w"]);
  const nextName = namePool(mulberry32(seed >>> 0), forbidden);
  const localMap = new Map<string, string>();
  const globalMap = new Map<string, string>();
  for (const name of locals) localMap.set(name, nextName());
  for (const name of globals) globalMap.set(name, nextName());

  const rng = mulberry32((seed ^ 0x9e3779b9) >>> 0);
  const edits: { start: number; end: number; text: string }[] = [];
  for (const ident of idents) {
    const mapped = ident.local ? localMap.get(ident.name) : globalMap.get(ident.name);
    if (!mapped || mapped === ident.name) continue;
    edits.push({ start: ident.start, end: ident.end, text: mapped });
  }

  walk(ast, null, "root", (node) => {
    if (!node.range) return;
    if (node.type === "NumericLiteral" || (node.type === "Literal" && typeof node.value === "number")) {
      if (typeof node.value !== "number" || !Number.isFinite(node.value)) return;
      const lit = mangleInt(node.value, rng);
      if (!lit) return;
      edits.push({ start: node.range[0], end: node.range[1], text: lit });
      return;
    }
    if (node.type !== "StringLiteral" && node.type !== "Literal") return;
    if (typeof node.raw !== "string" || node.raw.length > 80 || node.raw.startsWith("[")) return;
    const value = typeof node.value === "string" ? node.value : unescapeLuaString(node.raw);
    if (value == null || value.length > 48) return;
    const encoded = encodeLuaString(value, rng);
    if (!encoded) return;
    edits.push({ start: node.range[0], end: node.range[1], text: encoded });
  });

  const renamed = applyRanges(source, edits);
  const body = minifyLua(renamed);
  const left = /[A-Za-z0-9_]$/.test(PREAMBLE) && /^[A-Za-z_]/.test(body) ? " " : "";
  const right = /[A-Za-z0-9_]$/.test(body) ? " " : "";
  const wrapped = `${PREAMBLE}${left}${body}${right}end}):K()(...);`;
  try {
    parse(skeleton(wrapped), { luaVersion: "5.1", comments: false });
  } catch (err) {
    const message = err instanceof Error ? err.message : "sintaxis";
    throw new Error(`La salida no cerró bien (${message})`);
  }
  if (wrapped.includes("\n")) throw new Error("La salida tenía que ser una sola línea");
  return wrapped;
}
