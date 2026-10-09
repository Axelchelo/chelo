import { makeIns, type OpName, type Proto } from "@/lib/chelo/ir";

const FUSE = new Set([
  "Loadk+Add",
  "Loadk+Sub",
  "GetGlobal+Call",
  "Move+Call",
  "Loadk+Loadk",
  "GetGlobal+GetTable",
  "Self+Call",
]);

const SKIP_NEXT = new Set<OpName>(["Test", "Eq", "Lt", "Le", "TestSet", "TForLoop"]);

function closureSpan(fn: Proto) {
  const protect = new Set<number>();
  fn.instructions.forEach((ins, i) => {
    if (ins.op !== "Closure") return;
    protect.add(i);
    const n = fn.prototypes[ins.b]?.upvalCount ?? 0;
    for (let k = 1; k <= n; k++) protect.add(i + k);
  });
  return protect;
}

export function stripLines(fn: Proto) {
  fn.prototypes.forEach(stripLines);
}

export function insertJunk(fn: Proto, every: number) {
  if (every > 0) {
    const ins = fn.instructions;
    const protect = closureSpan(fn);
    const out = [];
    const map = new Map<number, number>();
    for (let i = 0; i < ins.length; i++) {
      map.set(i, out.length);
      out.push(ins[i]);
      const boundary = (i + 1) % every === 0;
      if (boundary && !protect.has(i) && !protect.has(i + 1)) {
        const junk = makeIns("Junk");
        junk.junk = true;
        out.push(junk);
      }
    }
    map.set(ins.length, out.length);
    for (const item of out) {
      if (item.target != null) {
        const next = map.get(item.target);
        if (next == null) throw new Error("Salto inválido tras insertar junk");
        item.target = next;
      }
    }
    fn.instructions = out;
  }
  fn.prototypes.forEach((p) => insertJunk(p, every));
}

export function fuseSuper(fn: Proto) {
  const ins = fn.instructions;
  const protect = closureSpan(fn);
  const targeted = new Set<number>();
  for (const item of ins) if (item.target != null) targeted.add(item.target);
  const out = [];
  const map = new Map<number, number>();
  let i = 0;
  while (i < ins.length) {
    const a = ins[i];
    const b = ins[i + 1];
    const ok =
      !!b &&
      FUSE.has(`${a.op}+${b.op}`) &&
      !protect.has(i) &&
      !protect.has(i + 1) &&
      !a.bind &&
      !b.bind &&
      !targeted.has(i + 1) &&
      !SKIP_NEXT.has(a.op) &&
      !(a.op === "LoadBool" && a.c !== 0) &&
      a.target == null &&
      b.target == null &&
      !a.junk &&
      !b.junk;
    if (ok && b) {
      map.set(i, out.length);
      map.set(i + 1, out.length);
      const sup = makeIns("Super", a.a, a.b, a.c);
      sup.superOps = [
        { op: a.op, a: a.a, b: a.b, c: a.c },
        { op: b.op, a: b.a, b: b.b, c: b.c },
      ];
      out.push(sup);
      i += 2;
    } else {
      map.set(i, out.length);
      out.push(a);
      i += 1;
    }
  }
  map.set(ins.length, out.length);
  for (const item of out) {
    if (item.target != null) {
      const next = map.get(item.target);
      if (next == null) throw new Error("Salto inválido tras super-ops");
      item.target = next;
    }
  }
  fn.instructions = out;
  fn.prototypes.forEach(fuseSuper);
}
