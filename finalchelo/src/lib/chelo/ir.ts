export const OPCODES = [
  "Move",
  "Loadk",
  "LoadBool",
  "LoadNil",
  "GetUpval",
  "GetGlobal",
  "GetTable",
  "SetGlobal",
  "SetUpval",
  "SetTable",
  "NewTable",
  "Self",
  "Add",
  "Sub",
  "Mul",
  "Div",
  "Mod",
  "Pow",
  "Unm",
  "Not",
  "Len",
  "Concat",
  "Jmp",
  "Eq",
  "Lt",
  "Le",
  "Test",
  "TestSet",
  "Call",
  "TailCall",
  "Return",
  "ForLoop",
  "ForPrep",
  "TForLoop",
  "SetList",
  "Close",
  "Closure",
  "VarArg",
  "Junk",
  "Super",
] as const;

export type OpName = (typeof OPCODES)[number];

export type InstrKind = "ABC" | "ABx" | "AsBx" | "DATA";

export const OP_TYPE: Record<OpName, InstrKind> = {
  Move: "ABC",
  Loadk: "ABx",
  LoadBool: "ABC",
  LoadNil: "ABC",
  GetUpval: "ABC",
  GetGlobal: "ABx",
  GetTable: "ABC",
  SetGlobal: "ABx",
  SetUpval: "ABC",
  SetTable: "ABC",
  NewTable: "ABC",
  Self: "ABC",
  Add: "ABC",
  Sub: "ABC",
  Mul: "ABC",
  Div: "ABC",
  Mod: "ABC",
  Pow: "ABC",
  Unm: "ABC",
  Not: "ABC",
  Len: "ABC",
  Concat: "ABC",
  Jmp: "AsBx",
  Eq: "ABC",
  Lt: "ABC",
  Le: "ABC",
  Test: "ABC",
  TestSet: "ABC",
  Call: "ABC",
  TailCall: "ABC",
  Return: "ABC",
  ForLoop: "AsBx",
  ForPrep: "AsBx",
  TForLoop: "ABC",
  SetList: "ABC",
  Close: "ABC",
  Closure: "ABx",
  VarArg: "ABC",
  Junk: "DATA",
  Super: "DATA",
};

export interface Const {
  type: "Nil" | "Boolean" | "Number" | "String";
  data: null | boolean | number | string;
}

export interface SuperOp {
  op: OpName;
  a: number;
  b: number;
  c: number;
}

export interface Ins {
  op: OpName;
  a: number;
  b: number;
  c: number;
  target: number | null;
  junk: boolean;
  bind: boolean;
  superOps: SuperOp[] | null;
}

export interface Proto {
  name: string;
  parameterCount: number;
  varargCount: number;
  upvalCount: number;
  stackSize: number;
  constants: Const[];
  instructions: Ins[];
  prototypes: Proto[];
}

export function makeIns(
  op: OpName,
  a = 0,
  b = 0,
  c = 0,
): Ins {
  return { op, a, b, c, target: null, junk: false, bind: false, superOps: null };
}

const JUMPS = new Set<OpName>(["Jmp", "ForLoop", "ForPrep"]);

export function linkJumps(fn: Proto) {
  fn.instructions.forEach((ins, i) => {
    if (JUMPS.has(ins.op) && ins.target == null) ins.target = i + ins.b + 1;
  });
  fn.prototypes.forEach(linkJumps);
}

export function markBinds(fn: Proto) {
  const ins = fn.instructions;
  for (let i = 0; i < ins.length; i++) {
    if (ins[i].op !== "Closure") continue;
    const n = fn.prototypes[ins[i].b]?.upvalCount ?? 0;
    for (let k = 1; k <= n; k++) if (ins[i + k]) ins[i + k].bind = true;
  }
  fn.prototypes.forEach(markBinds);
}

export function finalizeJumps(fn: Proto) {
  const ins = fn.instructions;
  for (let i = 0; i < ins.length; i++) {
    if (ins[i].target != null) ins[i].b = ins[i].target! - i - 1;
  }
  fn.prototypes.forEach(finalizeJumps);
}

export function countIns(fn: Proto): number {
  return (
    fn.instructions.length + fn.prototypes.reduce((n, p) => n + countIns(p), 0)
  );
}
