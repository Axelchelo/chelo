import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const ir = readFileSync(new URL('../src/lib/chelo/ir.ts', import.meta.url), 'utf8');
const runtime = readFileSync(new URL('../src/lib/chelo/runtime.ts', import.meta.url), 'utf8');
const studio = readFileSync(new URL('../src/components/studio.tsx', import.meta.url), 'utf8');
const opBlock = ir.match(/export const OPCODES = \[([\s\S]*?)\] as const/);
assert.ok(opBlock, 'Opcode list exists');
const opcodes = [...opBlock[1].matchAll(/"([A-Za-z]+)"/g)].map((m) => m[1]);
const vmStart = runtime.indexOf('export const VM_WRAP = "');
assert.ok(vmStart >= 0, 'VM wrapper exists');
for (const opcode of opcodes) {
  assert.ok(runtime.includes(`op == \\"${opcode}\\"`) || runtime.includes(`op == "${opcode}"`), `Runtime mentions opcode ${opcode}`);
}
assert.ok(runtime.includes('local function _pack'), 'Runtime preserves explicit return counts');
assert.ok(runtime.includes('runtime validation failed') && !runtime.includes('while true do end'), 'Runtime fails with an error instead of a deliberate infinite spin');
assert.ok(studio.includes('binaryBase64'), 'History persists binary input');
assert.ok(studio.includes('512 * 1024'), 'Upload limit is present');
console.log(`Static checks passed: ${opcodes.length} opcodes listed, runtime/history safeguards present.`);
