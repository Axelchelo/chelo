import { parse } from "luaparse";
import { makeIns, type Const, type Ins, type OpName, type Proto } from "@/lib/chelo/ir";

interface Ast {
  type: string;
  loc?: { start: { line: number } };
  [key: string]: unknown;
}

interface Local {
  name: string;
  reg: number;
  captured: boolean;
}

interface Upval {
  name: string;
  kind: "local" | "upval";
  index: number;
}

interface Loop {
  breaks: Ins[];
  localMark: number;
}

class CompileError extends Error {
  constructor(message: string, line: number) {
    super(line ? `Línea ${line}: ${message}` : message);
    this.name = "CompileError";
  }
}

const BIN: Record<string, OpName> = {
  "+": "Add",
  "-": "Sub",
  "*": "Mul",
  "/": "Div",
  "%": "Mod",
  "^": "Pow",
};

function isCall(node: Ast | undefined): boolean {
  return !!node && (node.type === "CallExpression" || node.type === "StringCallExpression" || node.type === "TableCallExpression");
}

function luaString(raw: string): string {
  if (raw.startsWith("[")) {
    const open = /^\[(=*)\[/.exec(raw);
    if (!open) throw new Error("Cadena larga inválida");
    const eq = open[1];
    const body = raw.slice(open[0].length, raw.length - (eq.length + 2));
    if (body.startsWith("\r\n")) return body.slice(2);
    if (body.startsWith("\n") || body.startsWith("\r")) return body.slice(1);
    return body;
  }
  let i = 1;
  let out = "";
  const end = raw.length - 1;
  while (i < end) {
    if (raw[i] !== "\\") {
      out += raw[i++];
      continue;
    }
    i += 1;
    const c = raw[i++] ?? "";
    const simple: Record<string, string> = {
      a: "\u0007", b: "\b", f: "\f", n: "\n", r: "\r", t: "\t", v: "\v",
      "\\": "\\", '"': '"', "'": "'",
    };
    if (c in simple) {
      out += simple[c];
      continue;
    }
    if (c === "\n") continue;
    if (c === "\r") {
      if (raw[i] === "\n") i += 1;
      continue;
    }
    if (c >= "0" && c <= "9") {
      let digits = c;
      for (let k = 0; k < 2 && raw[i] >= "0" && raw[i] <= "9"; k++) digits += raw[i++];
      out += String.fromCharCode(Number(digits) & 255);
      continue;
    }
    out += c;
  }
  return out;
}

class Func {
  instructions: Ins[] = [];
  constants: Const[] = [];
  prototypes: Proto[] = [];
  locals: Local[] = [];
  upvalues: Upval[] = [];
  nactvar = 0;
  freereg = 0;
  maxStack = 2;
  private keys = new Map<string, number>();
  private scopes: number[] = [];
  private acts: number[] = [];
  private loops: Loop[] = [];
  line = 1;

  constructor(
    readonly parent: Func | null,
    readonly parameterCount: number,
    readonly isVararg: boolean,
    readonly name: string,
  ) {}

  private at(node?: Ast) {
    const line = node?.loc?.start?.line;
    if (line) this.line = line;
    return this.line;
  }

  private fail(node: Ast | undefined, message: string): never {
    throw new CompileError(message, this.at(node));
  }

  private touch(reg: number) {
    if (reg + 1 > this.maxStack) this.maxStack = reg + 1;
  }

  private alloc(): number {
    if (this.freereg >= 249) this.fail(undefined, "La función usa demasiados registros");
    const r = this.freereg++;
    this.touch(r);
    return r;
  }

  private emit(op: OpName, a = 0, b = 0, c = 0): Ins {
    const ins = makeIns(op, a, b, c);
    this.instructions.push(ins);
    this.touch(a);
    return ins;
  }

  private addConst(c: Const): number {
    const key =
      c.type === "Nil" ? "Z" :
      c.type === "Boolean" ? `B${c.data ? 1 : 0}` :
      c.type === "Number" ? `N${Object.is(c.data, -0) ? "-0" : String(c.data)}` :
      `S${c.data as string}`;
    const hit = this.keys.get(key);
    if (hit != null) return hit;
    const idx = this.constants.length;
    this.constants.push(c);
    this.keys.set(key, idx);
    return idx;
  }

  private loadConst(dest: number, c: Const) {
    const idx = this.addConst(c);
    if (idx > 262143) this.fail(undefined, "Demasiadas constantes");
    this.emit("Loadk", dest, idx, 0);
  }

  private rkConst(c: Const): number {
    const idx = this.addConst(c);
    if (idx > 255) this.fail(undefined, "Demasiadas constantes en una sola expresión");
    return idx + 256;
  }

  private findLocal(name: string): Local | undefined {
    for (let i = this.locals.length - 1; i >= 0; i--) if (this.locals[i].name === name) return this.locals[i];
    return undefined;
  }

  private capture(name: string): number | null {
    if (!this.parent) return null;
    const have = this.upvalues.findIndex((u) => u.name === name);
    if (have >= 0) return have;
    const local = this.parent.findLocal(name);
    if (local) {
      local.captured = true;
      this.upvalues.push({ name, kind: "local", index: local.reg });
      return this.upvalues.length - 1;
    }
    const up = this.parent.capture(name);
    if (up == null) return null;
    this.upvalues.push({ name, kind: "upval", index: up });
    return this.upvalues.length - 1;
  }

  private pushLocal(name: string, reg: number) {
    this.locals.push({ name, reg, captured: false });
    this.touch(reg);
  }

  private enter() {
    this.scopes.push(this.locals.length);
    this.acts.push(this.nactvar);
  }

  private leave() {
    const mark = this.scopes.pop() ?? 0;
    const act = this.acts.pop() ?? 0;
    let min = Infinity;
    while (this.locals.length > mark) {
      const loc = this.locals.pop()!;
      if (loc.captured) min = Math.min(min, loc.reg);
    }
    if (min !== Infinity) this.emit("Close", min, 0, 0);
    this.nactvar = act;
    this.freereg = this.nactvar;
  }

  private closeFrom(mark: number) {
    let min = Infinity;
    for (let i = mark; i < this.locals.length; i++) if (this.locals[i].captured) min = Math.min(min, this.locals[i].reg);
    if (min !== Infinity) this.emit("Close", min, 0, 0);
  }

  private pin(target: number) {
    if (this.freereg < target + 1) this.freereg = target + 1;
  }

  private keep(target: number) {
    const next = Math.max(this.nactvar, target + 1);
    if (this.freereg < next) this.freereg = next;
    else if (target >= this.nactvar) this.freereg = next;
  }

  expr(node: Ast, dest?: number): number {
    this.at(node);
    const target = dest !== undefined ? dest : this.alloc();
    this.pin(target);
    switch (node.type) {
      case "NilLiteral":
        this.loadConst(target, { type: "Nil", data: null });
        break;
      case "BooleanLiteral":
        this.loadConst(target, { type: "Boolean", data: Boolean(node.value) });
        break;
      case "NumericLiteral":
        this.loadConst(target, { type: "Number", data: Number(node.value) });
        break;
      case "StringLiteral":
        this.loadConst(target, { type: "String", data: luaString(String(node.raw ?? "")) });
        break;
      case "VarargLiteral":
        if (!this.isVararg) this.fail(node, "`...` fuera de una función variádica");
        this.emit("VarArg", target, 2, 0);
        break;
      case "Identifier":
        this.identInto(String(node.name), target, node);
        break;
      case "UnaryExpression":
        this.unary(node, target);
        break;
      case "BinaryExpression":
        this.binary(node, target);
        break;
      case "LogicalExpression":
        this.logical(node, target);
        break;
      case "MemberExpression":
      case "IndexExpression":
        this.indexInto(node, target);
        break;
      case "CallExpression":
      case "StringCallExpression":
      case "TableCallExpression":
        this.compileCall(node, 1, target, false);
        break;
      case "TableConstructorExpression":
        this.tableInto(node, target);
        break;
      case "FunctionDeclaration":
        this.closureInto(target, node);
        break;
      default:
        this.fail(node, `Expresión no soportada (${node.type})`);
    }
    this.keep(target);
    return target;
  }

  private exprInto(node: Ast, dest: number) {
    const r = this.expr(node, dest);
    if (r !== dest) this.emit("Move", dest, r, 0);
  }

  private exprRK(node: Ast): number {
    if (node.type === "NumericLiteral") return this.rkConst({ type: "Number", data: Number(node.value) });
    if (node.type === "StringLiteral") return this.rkConst({ type: "String", data: luaString(String(node.raw ?? "")) });
    if (node.type === "BooleanLiteral") return this.rkConst({ type: "Boolean", data: Boolean(node.value) });
    if (node.type === "NilLiteral") return this.rkConst({ type: "Nil", data: null });
    return this.expr(node);
  }

  private identInto(name: string, dest: number, node: Ast) {
    const local = this.findLocal(name);
    if (local) {
      if (local.reg !== dest) this.emit("Move", dest, local.reg, 0);
      return;
    }
    const up = this.capture(name);
    if (up != null) {
      this.emit("GetUpval", dest, up, 0);
      return;
    }
    const k = this.addConst({ type: "String", data: name });
    this.emit("GetGlobal", dest, k, 0);
    void node;
  }

  private unary(node: Ast, target: number) {
    const op = String(node.operator);
    const arg = node.argument as Ast;
    if (op === "not") {
      const r = this.expr(arg);
      this.emit("Not", target, r, 0);
      return;
    }
    if (op === "-") {
      const r = this.expr(arg);
      this.emit("Unm", target, r, 0);
      return;
    }
    if (op === "#") {
      const r = this.expr(arg);
      this.emit("Len", target, r, 0);
      return;
    }
    this.fail(node, `Operador unario no soportado ${op}`);
  }

  private binary(node: Ast, target: number) {
    const op = String(node.operator);
    if (op === "..") {
      this.concatInto(node, target);
      return;
    }
    if (op === "==" || op === "~=" || op === "<" || op === ">" || op === "<=" || op === ">=") {
      this.compare(node, target);
      return;
    }
    const opc = BIN[op];
    if (!opc) this.fail(node, `Operador no soportado ${op}`);
    const left = node.left as Ast;
    const right = node.right as Ast;
    const b = this.exprRK(left);
    const c = this.exprRK(right);
    this.emit(opc, target, b, c);
  }

  private compare(node: Ast, target: number) {
    let b = this.exprRK(node.left as Ast);
    let c = this.exprRK(node.right as Ast);
    let code: OpName;
    let invert = 0;
    const op = String(node.operator);
    if (op === "==") code = "Eq";
    else if (op === "~=") {
      code = "Eq";
      invert = 1;
    } else if (op === "<") code = "Lt";
    else if (op === ">") {
      code = "Lt";
      const t = b; b = c; c = t;
    } else if (op === "<=") code = "Le";
    else {
      code = "Le";
      const t = b; b = c; c = t;
    }
    this.emit(code, invert, b, c);
    const jmp = this.emit("Jmp");
    this.emit("LoadBool", target, 1, 1);
    jmp.target = this.instructions.length;
    this.emit("LoadBool", target, 0, 0);
  }

  private concatInto(node: Ast, target: number) {
    const parts: Ast[] = [];
    const flat = (n: Ast) => {
      if (n.type === "BinaryExpression" && n.operator === "..") {
        flat(n.left as Ast);
        flat(n.right as Ast);
      } else parts.push(n);
    };
    flat(node);
    const base = Math.max(this.freereg, this.nactvar);
    for (let i = 0; i < parts.length; i++) {
      this.freereg = Math.max(this.nactvar, base + i);
      this.exprInto(parts[i], base + i);
      this.freereg = Math.max(this.nactvar, base + i + 1);
    }
    if (target >= base && target < base + parts.length) {
      const tmp = base + parts.length;
      this.emit("Concat", tmp, base, base + parts.length - 1);
      this.emit("Move", target, tmp, 0);
    } else {
      this.emit("Concat", target, base, base + parts.length - 1);
    }
  }

  private logical(node: Ast, target: number) {
    const op = String(node.operator);
    this.exprInto(node.left as Ast, target);
    this.emit("Test", target, 0, op === "and" ? 1 : 0);
    const jmp = this.emit("Jmp");
    this.freereg = Math.max(this.nactvar, target + 1);
    this.exprInto(node.right as Ast, target);
    jmp.target = this.instructions.length;
  }

  private indexInto(node: Ast, target: number) {
    if (node.type === "MemberExpression") {
      const base = this.expr(node.base as Ast);
      const key = this.rkConst({ type: "String", data: String((node.identifier as Ast).name) });
      this.emit("GetTable", target, base, key);
      return;
    }
    const base = this.expr(node.base as Ast);
    const key = this.exprRK(node.index as Ast);
    this.emit("GetTable", target, base, key);
  }

  private tableInto(node: Ast, target: number) {
    this.emit("NewTable", target, 0, 0);
    let array = 1;
    const fields = (node.fields as Ast[]) ?? [];
    for (const field of fields) {
      this.freereg = Math.max(this.nactvar, target + 1);
      let key: number;
      if (field.type === "TableValue") key = this.rkConst({ type: "Number", data: array++ });
      else if (field.type === "TableKeyString") key = this.rkConst({ type: "String", data: String((field.key as Ast).name) });
      else key = this.exprRK(field.key as Ast);
      const val = this.expr(field.value as Ast);
      this.emit("SetTable", target, key, val);
    }
  }

  private callShape(node: Ast): { callee: Ast; args: Ast[]; method: string | null } {
    if (node.type === "StringCallExpression") {
      return { callee: node.base as Ast, args: [node.argument as Ast], method: null };
    }
    if (node.type === "TableCallExpression") {
      return { callee: node.base as Ast, args: [node.arguments as Ast], method: null };
    }
    const base = node.base as Ast;
    if (base?.type === "MemberExpression" && base.indexer === ":") {
      return {
        callee: base.base as Ast,
        args: (node.arguments as Ast[]) ?? [],
        method: String((base.identifier as Ast).name),
      };
    }
    return { callee: base, args: (node.arguments as Ast[]) ?? [], method: null };
  }

  compileCall(node: Ast, nresults: number, base: number, tail: boolean) {
    this.at(node);
    const shape = this.callShape(node);
    if (shape.method) {
      this.freereg = Math.max(this.freereg, this.nactvar, base + 2);
      this.exprInto(shape.callee, base + 1);
      const key = this.rkConst({ type: "String", data: shape.method });
      this.emit("Self", base, base + 1, key);
    } else {
      this.freereg = Math.max(this.freereg, this.nactvar, base + 1);
      this.exprInto(shape.callee, base);
    }
    const arg0 = shape.method ? 2 : 1;
    let argc = 0;
    let vararg = false;
    for (let i = 0; i < shape.args.length; i++) {
      const arg = shape.args[i];
      const slot = base + arg0 + argc;
      if (arg.type === "VarargLiteral") {
        if (i !== shape.args.length - 1) this.fail(arg, "`...` tiene que ser el último argumento");
        if (!this.isVararg) this.fail(arg, "`...` fuera de una función variádica");
        this.emit("VarArg", slot, 0, 0);
        vararg = true;
        break;
      }
      this.freereg = Math.max(this.nactvar, slot + 1);
      this.exprInto(arg, slot);
      argc += 1;
    }
    const fixed = shape.method ? argc + 1 : argc;
    const B = vararg ? 0 : fixed + 1;
    const op: OpName = tail ? "TailCall" : "Call";
    const C = tail || nresults < 0 ? 0 : nresults + 1;
    this.emit(op, base, B, C);
    if (nresults > 0) this.freereg = Math.max(this.nactvar, base + nresults);
    else this.freereg = Math.max(this.nactvar, base);
  }

  private closureInto(dest: number, node: Ast) {
    let params = ((node.parameters as Ast[]) ?? []).slice();
    const id = node.identifier as Ast | null;
    if (id && id.type === "MemberExpression" && id.indexer === ":") {
      params = [{ type: "Identifier", name: "self" } as Ast, ...params];
    }
    const child = new Func(this, 0, false, this.name);
    child.compileFunction(params, (node.body as Ast[]) ?? []);
    const proto = child.finish();
    const idx = this.prototypes.length;
    this.prototypes.push(proto);
    this.emit("Closure", dest, idx, 0);
    for (const uv of child.upvalues) {
      const bind = this.emit(uv.kind === "local" ? "Move" : "GetUpval", 0, uv.index, 0);
      bind.bind = true;
    }
  }

  private compileFunction(params: Ast[], body: Ast[], mainChunk = false) {
    let vararg = false;
    const names: string[] = [];
    params.forEach((p, i) => {
      if (p.type === "VarargLiteral") {
        if (i !== params.length - 1) this.fail(p, "`...` tiene que ser el último parámetro");
        vararg = true;
        return;
      }
      if (p.type !== "Identifier") this.fail(p, "Parámetro no soportado");
      names.push(String(p.name));
    });
    (this as { isVararg: boolean }).isVararg = vararg || mainChunk;
    (this as { parameterCount: number }).parameterCount = names.length;
    names.forEach((name, i) => this.pushLocal(name, i));
    this.nactvar = names.length;
    this.freereg = this.nactvar;
    this.block(body);
    const last = this.instructions[this.instructions.length - 1];
    if (!last || (last.op !== "Return" && last.op !== "TailCall")) this.emit("Return", 0, 1, 0);
  }

  private block(body: Ast[]) {
    for (const stat of body) this.stat(stat);
  }

  private stat(node: Ast) {
    this.at(node);
    switch (node.type) {
      case "LocalStatement":
        this.localStat(node);
        return;
      case "AssignmentStatement":
        this.assignStat(node);
        return;
      case "CallStatement":
        this.compileCall(node.expression as Ast, 0, this.freereg, false);
        this.freereg = this.nactvar;
        return;
      case "ReturnStatement":
        this.returnStat(node);
        return;
      case "FunctionDeclaration":
        this.functionStat(node);
        return;
      case "DoStatement":
        this.enter();
        this.block(node.body as Ast[]);
        this.leave();
        return;
      case "IfStatement":
        this.ifStat(node);
        return;
      case "WhileStatement":
        this.whileStat(node);
        return;
      case "RepeatStatement":
        this.repeatStat(node);
        return;
      case "ForNumericStatement":
        this.numFor(node);
        return;
      case "ForGenericStatement":
        this.genFor(node);
        return;
      case "BreakStatement":
        this.breakStat(node);
        return;
      default:
        this.fail(node, `Sentencia no soportada (${node.type}). Lua 5.2+ (goto) no entra.`);
    }
  }

  private localStat(node: Ast) {
    const vars = node.variables as Ast[];
    const inits = (node.init as Ast[]) ?? [];
    const base = this.nactvar;
    const n = vars.length;
    this.nactvar = base + n;
    this.freereg = this.nactvar;
    if (inits.length === 0) {
      this.emit("LoadNil", base, base + n - 1, 0);
    } else if (inits.length === 1 && isCall(inits[0]) && n >= 1) {
      this.compileCall(inits[0], n, base, false);
    } else {
      const last = inits[inits.length - 1];
      const spread = isCall(last) && inits.length < n;
      const fixed = spread ? inits.length - 1 : Math.min(inits.length, n);
      for (let i = 0; i < fixed; i++) {
        this.freereg = Math.max(this.nactvar, base + n);
        this.exprInto(inits[i], base + i);
      }
      if (spread) {
        this.freereg = Math.max(this.nactvar, base + n);
        this.compileCall(last, n - (inits.length - 1), base + inits.length - 1, false);
      } else if (inits.length < n) {
        this.emit("LoadNil", base + inits.length, base + n - 1, 0);
      }
    }
    vars.forEach((v, i) => this.pushLocal(String(v.name), base + i));
    this.freereg = this.nactvar;
  }

  private prepLhs(node: Ast): { kind: "local"; reg: number } | { kind: "upval"; idx: number } | { kind: "global"; name: string } | { kind: "index"; table: number; key: number } {
    if (node.type === "Identifier") {
      const name = String(node.name);
      const local = this.findLocal(name);
      if (local) return { kind: "local", reg: local.reg };
      const up = this.capture(name);
      if (up != null) return { kind: "upval", idx: up };
      return { kind: "global", name };
    }
    if (node.type === "MemberExpression") {
      const base = this.expr(node.base as Ast);
      const key = this.rkConst({ type: "String", data: String((node.identifier as Ast).name) });
      return { kind: "index", table: base, key };
    }
    if (node.type === "IndexExpression") {
      const base = this.expr(node.base as Ast);
      const key = this.exprRK(node.index as Ast);
      return { kind: "index", table: base, key };
    }
    this.fail(node, "Asignación no soportada");
  }

  private store(prep: ReturnType<Func["prepLhs"]>, from: number) {
    if (prep.kind === "local") {
      if (prep.reg !== from) this.emit("Move", prep.reg, from, 0);
      return;
    }
    if (prep.kind === "upval") {
      this.emit("SetUpval", from, prep.idx, 0);
      return;
    }
    if (prep.kind === "global") {
      const k = this.addConst({ type: "String", data: prep.name });
      this.emit("SetGlobal", from, k, 0);
      return;
    }
    this.emit("SetTable", prep.table, prep.key, from);
  }

  private assignStat(node: Ast) {
    const lhs = node.variables as Ast[];
    const rhs = (node.init as Ast[]) ?? [];
    const preps = lhs.map((item) => this.prepLhs(item));
    const base = this.freereg;
    if (rhs.length === 1 && isCall(rhs[0])) {
      this.compileCall(rhs[0], lhs.length, base, false);
    } else {
      const last = rhs[rhs.length - 1];
      const spread = isCall(last) && rhs.length < lhs.length && rhs.length > 0;
      const fixed = spread ? rhs.length - 1 : Math.min(rhs.length, lhs.length);
      for (let i = 0; i < fixed; i++) {
        this.freereg = Math.max(base + lhs.length, this.nactvar);
        this.exprInto(rhs[i], base + i);
      }
      if (spread) {
        this.compileCall(last, lhs.length - (rhs.length - 1), base + rhs.length - 1, false);
      } else if (rhs.length < lhs.length) {
        this.emit("LoadNil", base + rhs.length, base + lhs.length - 1, 0);
      }
    }
    for (let i = 0; i < lhs.length; i++) this.store(preps[i], base + i);
    this.freereg = this.nactvar;
  }

  private returnStat(node: Ast) {
    const args = (node.arguments as Ast[]) ?? [];
    if (args.length === 0) {
      this.emit("Return", 0, 1, 0);
      return;
    }
    if (args.length === 1 && isCall(args[0])) {
      this.compileCall(args[0], -1, this.nactvar, true);
      return;
    }
    if (args.length === 1 && args[0].type === "VarargLiteral") {
      if (!this.isVararg) this.fail(args[0], "`...` fuera de una función variádica");
      this.emit("VarArg", this.nactvar, 0, 0);
      this.emit("Return", this.nactvar, 0, 0);
      return;
    }
    const base = this.freereg;
    const last = args[args.length - 1];
    if (isCall(last) && args.length > 1) {
      for (let i = 0; i < args.length - 1; i++) {
        this.freereg = base + i + 1;
        this.exprInto(args[i], base + i);
      }
      this.compileCall(last, -1, base + args.length - 1, false);
      this.emit("Return", base, 0, 0);
      return;
    }
    for (let i = 0; i < args.length; i++) {
      this.freereg = base + i + 1;
      this.exprInto(args[i], base + i);
    }
    this.emit("Return", base, args.length + 1, 0);
  }

  private functionStat(node: Ast) {
    const id = node.identifier as Ast | null;
    if (node.isLocal) {
      if (!id || id.type !== "Identifier") this.fail(node, "Función local inválida");
      const reg = this.nactvar++;
      this.freereg = this.nactvar;
      this.pushLocal(String(id.name), reg);
      this.closureInto(reg, node);
      this.freereg = this.nactvar;
      return;
    }
    if (!id) this.fail(node, "Función sin nombre");
    const reg = this.alloc();
    this.closureInto(reg, node);
    const target = id.type === "MemberExpression" && id.indexer === ":"
      ? { ...id, indexer: "." }
      : id;
    const prep = this.prepLhs(target);
    this.store(prep, reg);
    this.freereg = this.nactvar;
  }

  private ifStat(node: Ast) {
    const ends: Ins[] = [];
    const clauses = node.clauses as Ast[];
    clauses.forEach((clause, idx) => {
      let skip: Ins | null = null;
      if (clause.type !== "ElseClause") {
        const reg = this.expr(clause.condition as Ast);
        this.freereg = this.nactvar;
        this.emit("Test", reg, 0, 1);
        skip = this.emit("Jmp");
      }
      this.enter();
      this.block(clause.body as Ast[]);
      this.leave();
      if (idx !== clauses.length - 1) ends.push(this.emit("Jmp"));
      if (skip) skip.target = this.instructions.length;
    });
    const end = this.instructions.length;
    for (const j of ends) j.target = end;
  }

  private whileStat(node: Ast) {
    const loop: Loop = { breaks: [], localMark: this.locals.length };
    this.loops.push(loop);
    const start = this.instructions.length;
    const reg = this.expr(node.condition as Ast);
    this.freereg = this.nactvar;
    this.emit("Test", reg, 0, 1);
    const exit = this.emit("Jmp");
    this.enter();
    this.block(node.body as Ast[]);
    this.leave();
    const back = this.emit("Jmp");
    back.target = start;
    exit.target = this.instructions.length;
    for (const b of loop.breaks) b.target = this.instructions.length;
    this.loops.pop();
  }

  private repeatStat(node: Ast) {
    const loop: Loop = { breaks: [], localMark: this.locals.length };
    this.loops.push(loop);
    this.enter();
    const start = this.instructions.length;
    this.block(node.body as Ast[]);
    const reg = this.expr(node.condition as Ast);
    this.freereg = this.nactvar;
    this.emit("Test", reg, 0, 1);
    const back = this.emit("Jmp");
    back.target = start;
    this.leave();
    const exit = this.instructions.length;
    for (const b of loop.breaks) b.target = exit;
    this.loops.pop();
  }

  private breakStat(node: Ast) {
    const loop = this.loops[this.loops.length - 1];
    if (!loop) this.fail(node, "`break` fuera de un bucle");
    this.closeFrom(loop.localMark);
    loop.breaks.push(this.emit("Jmp"));
  }

  private numFor(node: Ast) {
    const base = this.nactvar;
    this.nactvar = base + 3;
    this.freereg = this.nactvar;
    this.exprInto(node.start as Ast, base);
    this.freereg = this.nactvar;
    this.exprInto(node.end as Ast, base + 1);
    this.freereg = this.nactvar;
    if (node.step) this.exprInto(node.step as Ast, base + 2);
    else this.loadConst(base + 2, { type: "Number", data: 1 });
    const localMark = this.locals.length;
    this.pushLocal(String((node.variable as Ast).name), base + 3);
    this.nactvar = base + 4;
    this.freereg = this.nactvar;
    const prep = this.emit("ForPrep", base, 0, 0);
    const bodyStart = this.instructions.length;
    const loop: Loop = { breaks: [], localMark };
    this.loops.push(loop);
    this.enter();
    this.block(node.body as Ast[]);
    this.leave();
    const loopIns = this.emit("ForLoop", base, 0, 0);
    prep.target = this.instructions.indexOf(loopIns);
    loopIns.target = bodyStart;
    this.closeFrom(localMark);
    this.locals.pop();
    this.nactvar = base;
    this.freereg = base;
    const exit = this.instructions.length;
    for (const b of loop.breaks) b.target = exit;
    this.loops.pop();
  }

  private genFor(node: Ast) {
    const base = this.nactvar;
    const vars = node.variables as Ast[];
    const iters = node.iterators as Ast[];
    this.nactvar = base + 3;
    this.freereg = this.nactvar;
    if (iters.length === 1 && isCall(iters[0])) {
      this.compileCall(iters[0], 3, base, false);
    } else {
      for (let i = 0; i < 3; i++) {
        this.freereg = Math.max(this.nactvar, base + 3);
        if (i < iters.length) this.exprInto(iters[i], base + i);
        else this.emit("LoadNil", base + i, base + i, 0);
      }
    }
    const localMark = this.locals.length;
    vars.forEach((v, i) => this.pushLocal(String(v.name), base + 3 + i));
    this.nactvar = base + 3 + vars.length;
    this.freereg = this.nactvar;
    const skip = this.emit("Jmp");
    const bodyStart = this.instructions.length;
    const loop: Loop = { breaks: [], localMark };
    this.loops.push(loop);
    this.enter();
    this.block(node.body as Ast[]);
    this.leave();
    skip.target = this.instructions.length;
    this.emit("TForLoop", base, 0, vars.length);
    const back = this.emit("Jmp");
    back.target = bodyStart;
    this.closeFrom(localMark);
    while (this.locals.length > localMark) this.locals.pop();
    this.nactvar = base;
    this.freereg = base;
    const exit = this.instructions.length;
    for (const b of loop.breaks) b.target = exit;
    this.loops.pop();
  }

  compileChunk(body: Ast[]) {
    this.compileFunction([], body, true);
  }

  finish(): Proto {
    return {
      name: this.name,
      parameterCount: this.parameterCount,
      varargCount: this.isVararg ? 2 : 0,
      upvalCount: this.upvalues.length,
      stackSize: Math.max(this.maxStack, this.parameterCount + 2, 2),
      constants: this.constants,
      instructions: this.instructions,
      prototypes: this.prototypes,
    };
  }
}

export function compileLua(source: string): Proto {
  let ast: Ast;
  try {
    ast = parse(source, { luaVersion: "5.1", locations: true }) as unknown as Ast;
  } catch (err) {
    const e = err as { line?: number; message?: string };
    const line = e.line ? `Línea ${e.line}: ` : "";
    throw new Error(`${line}${e.message ?? "Error de sintaxis Lua"}`);
  }
  const main = new Func(null, 0, true, "@chelo");
  main.compileChunk((ast.body as Ast[]) ?? []);
  return main.finish();
}
