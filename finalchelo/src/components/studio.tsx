import { useEffect, useId, useMemo, useRef, useState } from "react";
import * as Slider from "@radix-ui/react-slider";
import * as Switch from "@radix-ui/react-switch";
import {
  Check,
  Copy,
  Download,
  Dices,
  FileUp,
  History,
  Lock,
  Shield,
  Trash2,
} from "lucide-react";
import { obfuscate, type ObfuscateResult } from "@/lib/chelo/obfuscate";

const DRAFT_KEY = "chelo-draft-v1";
const HIST_KEY = "chelo-history-v1";

const SAMPLES: { id: string; label: string; source: string }[] = [
  {
    id: "hola",
    label: "Hola",
    source: `print("hola desde chelo")\n`,
  },
  {
    id: "fib",
    label: "Fibonacci",
    source: `local function fib(n)
  if n < 2 then
    return n
  end
  return fib(n - 1) + fib(n - 2)
end

print(fib(10))
`,
  },
  {
    id: "tabla",
    label: "Tabla",
    source: `local inventory = {
  name = "chelo",
  slots = 8,
}

for i = 1, inventory.slots do
  inventory[i] = i * i
end

print(inventory.name, inventory[3])
`,
  },
  {
    id: "cierre",
    label: "Cierre",
    source: `local function counter(start)
  local n = start or 0
  return function(step)
    n = n + (step or 1)
    return n
  end
end

local tick = counter(10)
print(tick())
print(tick(4))
`,
  },
  {
    id: "bucle",
    label: "Bucle",
    source: `local n = 1
repeat
  n = n * 2
until n > 32

local sum = 0
local i = 1
while i <= 5 do
  sum = sum + i
  i = i + 1
end

print(n, sum)
`,
  },
];

const PRESETS: { id: string; label: string; anti: number; junk: number; superops: boolean; hint: string }[] = [
  { id: "light", label: "Ligero", anti: 1, junk: 0, superops: false, hint: "Poco ruido, arranque corto" },
  { id: "std", label: "Estándar", anti: 2, junk: 5, superops: true, hint: "El que usarías por defecto" },
  { id: "max", label: "Máximo", anti: 3, junk: 12, superops: true, hint: "Canaries y más junk" },
];

const ANTI = [
  { value: 0, label: "Off", hint: "Sin anti-dump. Sirve para depurar la salida." },
  { value: 1, label: "1", hint: "Capa rápida: anti-hook y sondas ligeras." },
  { value: 2, label: "2", hint: "Estándar: anti-hook más anti-dump." },
  { value: 3, label: "3", hint: "Completo: incluye los canaries de nivel 3." },
];

type HistoryItem = {
  id: string;
  at: number;
  label: string;
  source: string;
  binaryBase64?: string;
  fileLabel?: string;
  seed: number;
  anti: number;
  junk: number;
  superops: boolean;
  outputBytes: number;
};

type BinaryFile = { name: string; bytes: Uint8Array };

function looksLikeLuac(bytes: Uint8Array) {
  return bytes.length >= 4 && bytes[0] === 0x1b && bytes[1] === 0x4c && bytes[2] === 0x75 && bytes[3] === 0x61;
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + 0x8000, bytes.length)));
  }
  return btoa(binary);
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  return `${(n / 1024).toLocaleString("es", { maximumFractionDigits: 1 })} KB`;
}

function formatTime(at: number) {
  return new Date(at).toLocaleString("es", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" });
}

function Mark() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className="size-9">
      <rect width="32" height="32" rx="8" className="fill-primary" />
      <path
        d="M22.5 9.2a8.2 8.2 0 1 0 2.1 6.3h-3.1a5.2 5.2 0 1 1-1.3-3.6H16V9.2h6.5Z"
        className="fill-ink"
      />
    </svg>
  );
}

export function Studio() {
  const fileId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState(SAMPLES[0].source);
  const [binary, setBinary] = useState<BinaryFile | null>(null);
  const [fileLabel, setFileLabel] = useState("");
  const [seed, setSeed] = useState("");
  const [anti, setAnti] = useState(2);
  const [junk, setJunk] = useState(5);
  const [superops, setSuperops] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ObfuscateResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw) as {
          source?: string;
          seed?: string;
          anti?: number;
          junk?: number;
          superops?: boolean;
        };
        if (typeof draft.source === "string" && draft.source.length > 0) setSource(draft.source);
        if (typeof draft.seed === "string") setSeed(draft.seed);
        if (typeof draft.anti === "number") setAnti(Math.max(0, Math.min(3, draft.anti)));
        if (typeof draft.junk === "number") setJunk(Math.max(0, Math.min(20, draft.junk)));
        if (typeof draft.superops === "boolean") setSuperops(draft.superops);
      }
      const hist = localStorage.getItem(HIST_KEY);
      if (hist) {
        const parsed = JSON.parse(hist) as HistoryItem[];
        if (Array.isArray(parsed)) setHistory(parsed.slice(0, 6));
      }
    } catch {
      /* ignore broken storage */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const handle = window.setTimeout(() => {
      try {
        localStorage.setItem(
          DRAFT_KEY,
          JSON.stringify({ source, seed, anti, junk, superops }),
        );
      } catch {
        /* quota */
      }
    }, 250);
    return () => window.clearTimeout(handle);
  }, [source, seed, anti, junk, superops, hydrated]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        void run();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // run closes over latest state; the listener is refreshed each render via this effect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  });

  const antiHint = ANTI.find((item) => item.value === anti)?.hint ?? "";
  const activePreset = PRESETS.find(
    (preset) => preset.anti === anti && preset.junk === junk && preset.superops === superops,
  )?.id;

  const stats = useMemo(() => {
    if (!result) return [];
    const { meta } = result;
    return [
      ["Semilla", String(meta.seed)],
      ["Origen", meta.source === "luac" ? ".luac" : "Lua"],
      ["Instrucciones", String(meta.instructions)],
      ["Constantes", String(meta.constants)],
      ["Prototipos", String(meta.prototypes)],
      ["Payload", formatBytes(meta.payloadBytes)],
      ["Salida", formatBytes(meta.outputBytes)],
      ["Anti", String(meta.antiLevel)],
    ];
  }, [result]);

  function applySample(id: string) {
    const sample = SAMPLES.find((item) => item.id === id);
    if (!sample) return;
    setSource(sample.source);
    setBinary(null);
    setFileLabel("");
    setError(null);
  }

  function applyPreset(id: string) {
    const preset = PRESETS.find((item) => item.id === id);
    if (!preset) return;
    setAnti(preset.anti);
    setJunk(preset.junk);
    setSuperops(preset.superops);
  }

  async function onFile(file: File) {
    if (file.size > 512 * 1024) {
      setError("El archivo supera el límite de 512 KB para mantener estable el historial local.");
      return;
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const lower = file.name.toLowerCase();
    if (looksLikeLuac(bytes) || lower.endsWith(".luac")) {
      if (!looksLikeLuac(bytes)) {
        setError("Ese archivo no tiene la cabecera de un binario Lua 5.1.");
        return;
      }
      setBinary({ name: file.name, bytes });
      setFileLabel(file.name);
      setError(null);
      return;
    }
    setBinary(null);
    setSource(new TextDecoder().decode(bytes).replace(/^\uFEFF/, ""));
    setFileLabel(file.name);
    setError(null);
  }

  async function run() {
    setBusy(true);
    setError(null);
    setCopied(false);
    await new Promise((resolve) => window.setTimeout(resolve, 30));
    try {
      const parsedSeed = seed.trim() === "" ? null : Number(seed);
      if (parsedSeed != null && !Number.isFinite(parsedSeed)) {
        throw new Error("La semilla tiene que ser un número.");
      }
      const output = obfuscate(binary ? binary.bytes : source, {
        seed: parsedSeed,
        antiLevel: anti,
        junkEvery: junk,
        superops,
      });
      setResult(output);
      if (seed.trim() === "") setSeed(String(output.meta.seed));
      const item: HistoryItem = {
        id: `${output.meta.seed}-${Date.now()}`,
        at: Date.now(),
        label: fileLabel || source.trim().split("\n")[0]?.slice(0, 42) || "script",
        source,
        ...(binary ? { binaryBase64: bytesToBase64(binary.bytes), fileLabel: binary.name } : {}),
        seed: output.meta.seed,
        anti,
        junk,
        superops,
        outputBytes: output.meta.outputBytes,
      };
      setHistory((prev) => {
        const next = [item, ...prev].slice(0, 6);
        try {
          localStorage.setItem(HIST_KEY, JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : "No se pudo ofuscar.");
    } finally {
      setBusy(false);
    }
  }

  async function copyOut() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.lua);
    } catch {
      const area = document.createElement("textarea");
      area.value = result.lua;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  function download() {
    if (!result) return;
    const blob = new Blob([result.lua], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `chelo_${result.meta.seed}.lua`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function restore(item: HistoryItem) {
    setSource(item.source);
    setBinary(item.binaryBase64 ? { name: item.fileLabel || "restored.luac", bytes: base64ToBytes(item.binaryBase64) } : null);
    setFileLabel(item.fileLabel || "");
    setSeed(String(item.seed));
    setAnti(item.anti);
    setJunk(item.junk);
    setSuperops(item.superops);
    setError(null);
  }

  function clearAll() {
    setSource("");
    setBinary(null);
    setFileLabel("");
    setResult(null);
    setError(null);
  }

  return (
    <div className="min-h-screen bg-bg text-fg">
      <header className="border-b border-line/80 bg-bg/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Mark />
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold tracking-tight sm:text-xl">Chelo Obfuscator</h1>
              <p className="truncate text-xs text-muted sm:text-sm">Protege tu código Lua y Luau en segundos</p>
            </div>
          </div>
          <div className="hidden items-center gap-3 text-xs text-muted sm:flex">
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-2">
              <span className="size-2 rounded-full bg-primary" aria-hidden="true" /> Motor listo
            </span>
            <span className="rounded-full border border-line px-3 py-2">v14.0</span>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
        <section className="relative overflow-hidden rounded-3xl border border-line bg-surface p-6 shadow-card sm:p-8">
          <div className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-primary/10 blur-3xl" aria-hidden="true" />
          <div className="relative max-w-3xl">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-primary">Lua protection studio</p>
            <h2 className="text-3xl font-bold tracking-tight text-balance sm:text-5xl">Convierte tu código en una sola línea imposible de leer.</h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-muted sm:text-base">Compila, transforma y descarga una salida lista para ejecutar. Todo sucede en tu navegador: tu código no sale de este dispositivo.</p>
            <div className="mt-6 flex flex-wrap gap-2 text-xs text-muted">
              <span className="rounded-full bg-bg px-3 py-2">Lua 5.1</span>
              <span className="rounded-full bg-bg px-3 py-2">Luau bootstrap</span>
              <span className="rounded-full bg-bg px-3 py-2">Sin servidor</span>
            </div>
          </div>
        </section>

        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          <section className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-4 sm:px-5">
              <div><div className="flex items-center gap-2"><span className="flex size-7 items-center justify-center rounded-lg bg-primary/15 text-primary">01</span><h2 className="text-base font-semibold">Fuente</h2></div><p className="mt-1 text-xs text-muted">Pega Lua 5.1 o sube un archivo .lua / .luac</p></div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="sr-only" htmlFor="sample">Ejemplos</label>
                <select id="sample" className="h-10 rounded-lg border border-line bg-bg px-3 text-sm text-fg" defaultValue="" onChange={(event) => { if (event.target.value) applySample(event.target.value); event.target.value = ""; }}>
                  <option value="" disabled>Ejemplos</option>{SAMPLES.map((sample) => <option key={sample.id} value={sample.id}>{sample.label}</option>)}
                </select>
                <input ref={fileRef} id={fileId} type="file" accept=".lua,.luac,.txt" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) void onFile(file); event.target.value = ""; }} />
                <button type="button" className="inline-flex h-10 items-center gap-2 rounded-lg border border-line bg-bg px-3 text-sm" onClick={() => fileRef.current?.click()}><FileUp className="size-4" aria-hidden="true" /> Subir</button>
                <button type="button" className="inline-flex size-10 items-center justify-center rounded-lg border border-line bg-bg" onClick={clearAll} aria-label="Vaciar fuente"><Trash2 className="size-4" aria-hidden="true" /></button>
              </div>
            </div>
            {binary ? <div className="mx-4 mt-4 flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/10 px-3 py-3 text-sm"><p className="min-w-0 truncate">Bytecode <span className="font-medium">{binary.name}</span><span className="text-muted"> · {formatBytes(binary.bytes.length)}</span></p><button type="button" className="shrink-0 text-primary" onClick={() => { setBinary(null); setFileLabel(""); }}>Quitar</button></div> : null}
            <div className="px-4 pb-4 pt-4 sm:px-5">
              <textarea value={source} spellCheck={false} aria-label="Código Lua" placeholder='print("hola")' onChange={(event) => setSource(event.target.value)} className="min-h-[22rem] w-full resize-y rounded-xl border border-line bg-bg p-4 font-mono text-sm leading-relaxed text-fg outline-none transition focus:border-primary placeholder:text-muted sm:min-h-[28rem]" />
              <p className="mt-3 text-xs text-muted">{source.length.toLocaleString("es")} caracteres · Ctrl/Cmd + Enter para ejecutar</p>
            </div>
          </section>

          <section className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-4 sm:px-5">
              <div><div className="flex items-center gap-2"><span className="flex size-7 items-center justify-center rounded-lg bg-primary/15 text-primary">02</span><h2 className="text-base font-semibold">Resultado</h2></div><p className="mt-1 text-xs text-muted">Salida lista para copiar o descargar</p></div>
              <div className="flex items-center gap-2"><button type="button" disabled={!result} onClick={() => void copyOut()} className="inline-flex h-10 items-center gap-2 rounded-lg border border-line bg-bg px-3 text-sm disabled:opacity-40">{copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}{copied ? "Copiado" : "Copiar"}</button><button type="button" disabled={!result} onClick={download} className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-3 text-sm font-semibold text-ink disabled:opacity-40"><Download className="size-4" aria-hidden="true" /> Descargar</button></div>
            </div>
            <div className="px-4 pb-4 pt-4 sm:px-5"><textarea readOnly value={result?.lua ?? ""} spellCheck={false} aria-label="Script ofuscado" placeholder={'return({x=table.create,…}):K()(…);'} className="min-h-[22rem] w-full resize-y rounded-xl border border-line bg-bg p-4 font-mono text-sm leading-relaxed text-fg outline-none placeholder:text-muted sm:min-h-[28rem]" /><p className="mt-3 text-xs text-muted">{result ? `Generado con semilla ${result.meta.seed} · ${formatBytes(result.meta.outputBytes)}` : "Aún no hay una salida generada"}</p></div>
          </section>
        </div>

        <section className="rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5">
          <div className="mb-5 flex items-center gap-3"><span className="flex size-7 items-center justify-center rounded-lg bg-primary/15 text-primary">03</span><div><h2 className="text-base font-semibold">Configuración de protección</h2><p className="text-xs text-muted">Ajusta el nivel de transformación antes de generar</p></div></div>
          <div className="grid gap-5 lg:grid-cols-3">
            <div className="flex flex-col gap-3"><p className="text-xs font-semibold uppercase tracking-wider text-muted">Preset</p><div className="grid grid-cols-3 gap-2">{PRESETS.map((preset) => <button key={preset.id} type="button" onClick={() => applyPreset(preset.id)} aria-pressed={activePreset === preset.id} className={"h-11 rounded-lg border px-2 text-sm transition " + (activePreset === preset.id ? "border-primary bg-primary text-ink" : "border-line bg-bg text-fg hover:border-primary/60")}>{preset.label}</button>)}</div><p className="text-xs text-muted">{PRESETS.find((preset) => preset.id === activePreset)?.hint ?? "Ajuste manual"}</p></div>
            <div className="flex flex-col gap-3"><p className="text-xs font-semibold uppercase tracking-wider text-muted">Anti-dump</p><div className="grid grid-cols-4 gap-2" role="group" aria-label="Nivel anti-dump">{ANTI.map((item) => <button key={item.value} type="button" aria-pressed={anti === item.value} onClick={() => setAnti(item.value)} className={"h-11 rounded-lg border text-sm transition " + (anti === item.value ? "border-primary bg-primary text-ink" : "border-line bg-bg text-fg hover:border-primary/60")}>{item.label}</button>)}</div><p className="text-xs text-muted">{antiHint}</p></div>
            <div className="flex flex-col gap-3"><div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-wider text-muted">Semilla</p><button type="button" className="inline-flex h-8 items-center gap-1 text-xs text-primary" onClick={() => setSeed("")}><Dices className="size-3.5" aria-hidden="true" /> Aleatoria</button></div><input inputMode="numeric" value={seed} placeholder="vacío = nueva" aria-label="Semilla" onChange={(event) => setSeed(event.target.value.replace(/[^\d]/g, "").slice(0, 10))} className="h-11 rounded-lg border border-line bg-bg px-3 font-mono text-sm tabular-nums outline-none placeholder:text-muted focus:border-primary" /><p className="text-xs text-muted">Misma semilla, mismo mapa de opcodes.</p></div>
          </div>
          <div className="mt-5 grid items-end gap-5 border-t border-line pt-5 md:grid-cols-[minmax(0,1fr)_auto_auto]"><div><div className="mb-2 flex items-baseline justify-between"><p className="text-xs font-semibold uppercase tracking-wider text-muted">Junk</p><p className="font-mono text-sm tabular-nums">{junk === 0 ? "off" : `cada ${junk}`}</p></div><Slider.Root className="relative flex h-11 w-full touch-none items-center" min={0} max={20} step={1} value={[junk]} onValueChange={(value) => setJunk(value[0] ?? 0)}><Slider.Track className="relative h-1.5 grow rounded-full bg-raised"><Slider.Range className="absolute h-full rounded-full bg-primary" /></Slider.Track><Slider.Thumb aria-label="Cada cuántas instrucciones se inserta junk" className="block size-5 rounded-full bg-primary shadow-card outline-none focus-visible:ring-2 focus-visible:ring-primary" /></Slider.Root></div><label className="flex h-11 items-center gap-3 rounded-lg border border-line bg-bg px-3"><Switch.Root checked={superops} onCheckedChange={setSuperops} className="relative h-7 w-12 shrink-0 rounded-full bg-raised outline-none data-[state=checked]:bg-primary focus-visible:ring-2 focus-visible:ring-primary"><Switch.Thumb className="block size-5 translate-x-1 rounded-full bg-fg transition-transform data-[state=checked]:translate-x-6 data-[state=checked]:bg-ink" /></Switch.Root><span className="text-sm">Super-ops</span></label><button type="button" onClick={() => void run()} disabled={busy || (!binary && !source.trim())} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-ink transition hover:brightness-110 disabled:opacity-40"><Lock className="size-4" aria-hidden="true" />{busy ? "Ofuscando…" : "Ofuscar ahora"}</button></div>
          {error ? <p role="alert" className="mt-4 rounded-lg border border-danger/40 bg-danger/10 px-3 py-3 text-sm text-pretty text-danger">{error}</p> : null}
        </section>

        {result ? <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">{stats.map(([label, value]) => <div key={label} className="rounded-xl border border-line bg-surface px-3 py-3 shadow-card"><dt className="text-xs text-muted">{label}</dt><dd className="mt-1 font-mono text-sm tabular-nums">{value}</dd></div>)}</dl> : null}
        {history.length > 0 ? <section><h2 className="mb-3 flex items-center gap-2 text-sm font-semibold"><History className="size-4 text-primary" aria-hidden="true" /> Historial reciente</h2><ul className="flex gap-2 overflow-x-auto pb-1">{history.map((item) => <li key={item.id} className="shrink-0"><button type="button" onClick={() => restore(item)} className="h-11 max-w-56 truncate rounded-lg border border-line bg-surface px-3 text-left text-sm hover:border-primary"><span className="font-mono text-xs text-primary tabular-nums">{item.seed}</span><span className="text-muted"> · {formatTime(item.at)}</span></button></li>)}</ul></section> : null}

        <section className="grid gap-4 border-t border-line pt-6 pb-8 md:grid-cols-3"><article className="rounded-2xl border border-line bg-surface p-5"><Shield className="mb-4 size-5 text-primary" aria-hidden="true" /><h2 className="font-semibold">Protección local</h2><p className="mt-2 text-sm leading-relaxed text-muted">El procesamiento ocurre directamente en tu navegador. No enviamos tu código a ningún servidor.</p></article><article className="rounded-2xl border border-line bg-surface p-5"><Lock className="mb-4 size-5 text-primary" aria-hidden="true" /><h2 className="font-semibold">Flujo rápido</h2><p className="mt-2 text-sm leading-relaxed text-muted">Pega, configura, ofusca y descarga. Usa Ctrl o Cmd + Enter para ejecutar sin tocar el ratón.</p></article><article className="rounded-2xl border border-line bg-surface p-5"><FileUp className="mb-4 size-5 text-primary" aria-hidden="true" /><h2 className="font-semibold">Límites honestos</h2><p className="mt-2 text-sm leading-relaxed text-muted">Salida Luau en una línea. Los niveles anti-dump dificultan el análisis, pero no son una garantía contra ingeniería inversa.</p></article></section>
      </main>
      <footer className="border-t border-line py-5 text-center text-xs text-muted">Chelo Obfuscator · tu código permanece en este navegador</footer>
    </div>
  );
}
