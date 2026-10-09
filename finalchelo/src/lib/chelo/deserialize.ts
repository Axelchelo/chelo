import { OP_TYPE, makeIns, type Const, type OpName, type Proto } from "@/lib/chelo/ir";

const OP_BY_ID = [
  "Move", "Loadk", "LoadBool", "LoadNil", "GetUpval", "GetGlobal", "GetTable",
  "SetGlobal", "SetUpval", "SetTable", "NewTable", "Self", "Add", "Sub", "Mul",
  "Div", "Mod", "Pow", "Unm", "Not", "Len", "Concat", "Jmp", "Eq", "Lt", "Le",
  "Test", "TestSet", "Call", "TailCall", "Return", "ForLoop", "ForPrep", "TForLoop",
  "SetList", "Close", "Closure", "VarArg",
] as const;

class Reader {
  i = 0;
  intSize = 4;
  sizeT = 8;
  big = false;
  constructor(readonly b: Uint8Array) {}
  left(n: number) {
    if (this.i + n > this.b.length) throw new Error("Bytecode Lua malformado");
  }
  u8() {
    this.left(1);
    return this.b[this.i++];
  }
  uint(n: number) {
    this.left(n);
    let v = 0;
    if (this.big) {
      for (let k = 0; k < n; k++) v = v * 256 + this.b[this.i++];
    } else {
      for (let k = 0; k < n; k++) v += this.b[this.i++] * 2 ** (8 * k);
    }
    return v;
  }
  i32() {
    return this.uint(this.intSize);
  }
  size() {
    return this.uint(this.sizeT);
  }
  f64() {
    this.left(8);
    const tmp = this.b.slice(this.i, this.i + 8);
    this.i += 8;
    const view = new DataView(tmp.buffer, tmp.byteOffset, 8);
    return view.getFloat64(0, !this.big);
  }
  str() {
    const n = this.size();
    if (n === 0) return "";
    this.left(n);
    let s = "";
    for (let k = 0; k < n; k++) s += String.fromCharCode(this.b[this.i++]);
    return s.endsWith("\0") ? s.slice(0, -1) : s;
  }
  code() {
    const word = this.uint(4);
    const op = word & 0x3f;
    const A = (word >>> 6) & 0xff;
    const name = OP_BY_ID[op] as OpName | undefined;
    if (!name) throw new Error(`Opcode Lua desconocido ${op}`);
    const kind = OP_TYPE[name];
    let B = 0;
    let C = 0;
    if (kind === "ABC") {
      C = (word >>> 14) & 0x1ff;
      B = (word >>> 23) & 0x1ff;
    } else if (kind === "ABx") {
      B = (word >>> 14) & 0x3ffff;
    } else if (kind === "AsBx") {
      B = ((word >>> 14) & 0x3ffff) - 131071;
    }
    const ins = makeIns(name, A, B, C);
    return ins;
  }
}

function chunk(r: Reader): Proto {
  const name = r.str();
  r.i32();
  r.i32();
  const upvalCount = r.u8();
  const parameterCount = r.u8();
  const varargCount = r.u8();
  const stackSize = r.u8();
  const ncode = r.i32();
  const instructions = [];
  for (let i = 0; i < ncode; i++) instructions.push(r.code());
  const nconst = r.i32();
  const constants: Const[] = [];
  for (let i = 0; i < nconst; i++) {
    const t = r.u8();
    if (t === 0) constants.push({ type: "Nil", data: null });
    else if (t === 1) constants.push({ type: "Boolean", data: r.u8() !== 0 });
    else if (t === 3) constants.push({ type: "Number", data: r.f64() });
    else if (t === 4) constants.push({ type: "String", data: r.str() });
    else throw new Error(`Constante Lua tipo ${t} no soportada`);
  }
  const nproto = r.i32();
  const prototypes = [];
  for (let i = 0; i < nproto; i++) prototypes.push(chunk(r));
  const nline = r.i32();
  for (let i = 0; i < nline; i++) r.i32();
  const nloc = r.i32();
  for (let i = 0; i < nloc; i++) {
    r.str();
    r.i32();
    r.i32();
  }
  const nuv = r.i32();
  for (let i = 0; i < nuv; i++) r.str();
  return {
    name,
    parameterCount,
    varargCount,
    upvalCount,
    stackSize,
    constants,
    instructions,
    prototypes,
  };
}

export function deserializeLuac(bytes: Uint8Array): Proto {
  if (bytes.length < 12 || bytes[0] !== 0x1b || bytes[1] !== 0x4c || bytes[2] !== 0x75 || bytes[3] !== 0x61) {
    throw new Error("No es un binario Lua 5.1 (.luac)");
  }
  const r = new Reader(bytes);
  r.i = 4;
  const version = r.u8();
  if (version !== 0x51) throw new Error(`Solo Lua 5.1 (header 0x${version.toString(16)})`);
  r.u8();
  r.big = r.u8() === 0;
  r.intSize = r.u8();
  r.sizeT = r.u8();
  const instr = r.u8();
  const num = r.u8();
  const integral = r.u8();
  if (r.intSize !== 4 || instr !== 4 || num !== 8 || integral !== 0) {
    throw new Error("Header Lua no estándar (se espera int32, instrucciones de 4 bytes y doubles)");
  }
  if (r.sizeT !== 4 && r.sizeT !== 8) throw new Error("size_t no soportado");
  return chunk(r);
}
