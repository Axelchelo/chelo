# Chelo Obfuscator v14 — release candidate notes

## Included in this package

- Original project structure and app-builder configuration retained.
- Runtime failures now report an error instead of deliberately spinning forever, so a malformed payload or failed validation does not intentionally lock up the host.
- Binary `.luac` history entries retain their byte payload and can be restored.
- File upload limit is enforced in the browser before processing.
- VM argument/return packing was improved to preserve explicit counts, including nil-containing argument/return lists in the paths covered by the implementation.
- Probe failure messages use a stable diagnostic string rather than an undefined variable.

## Compatibility statement

The project contains a Lua/Luau compiler, a Lua 5.1 bytecode reader, a custom VM, and Roblox-oriented runtime checks. Compatibility must be stated narrowly: the existence of a selector or parser does not establish full support for every Lua version, Luau extension, Roblox executor, or arbitrary `.luac` file. Unsupported syntax and bytecode versions should be treated as unsupported rather than silently accepted.

## Validation status

- ZIP integrity: checked after packaging.
- Static source checks: run before packaging.
- Full production build, browser E2E, and execution of generated output in Lua/Luau: not certified in this environment because dependency installation did not complete and no Lua/Luau interpreter was available.

This is deliberately documented rather than claiming tests passed when they could not be run. Before advertising the project as production-ready, run `npm ci`, `npm run typecheck`, `npm test`, `npm run build`, and a runtime test matrix against the exact Lua/Luau environments being advertised.
