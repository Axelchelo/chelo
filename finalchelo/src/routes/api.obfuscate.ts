import { createFileRoute } from "@tanstack/react-router";
import { obfuscate } from "@/lib/chelo/obfuscate";

const MAX_SOURCE_BYTES = 512 * 1024;
const MAX_BINARY_BYTES = 2 * 1024 * 1024;
const MAX_BODY_BYTES = 3 * 1024 * 1024;

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: jsonHeaders,
  });
}

function decodeBase64(value: string) {
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(value) || value.length % 4 !== 0) {
    throw new Error("binaryBase64 debe ser base64 válido.");
  }
  const bytes = Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
  if (bytes.byteLength > MAX_BINARY_BYTES) {
    throw new Error("El archivo .luac supera el límite de 2 MiB.");
  }
  return bytes;
}

function numberOption(value: unknown, name: string, fallback: number) {
  if (value == null) return fallback;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${name} debe ser un número finito.`);
  }
  return value;
}

export const Route = createFileRoute("/api/obfuscate")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const contentLength = Number(request.headers.get("content-length") ?? 0);
          if (contentLength > MAX_BODY_BYTES) {
            return json({ error: "La petición supera el límite de 3 MiB." }, 413);
          }

          const body = (await request.json()) as Record<string, unknown>;
          const source = typeof body.source === "string" ? body.source : "";
          const binaryBase64 = typeof body.binaryBase64 === "string" ? body.binaryBase64 : "";

          if ((source && binaryBase64) || (!source && !binaryBase64)) {
            return json({ error: "Envía exactamente uno de source o binaryBase64." }, 400);
          }
          if (source && new TextEncoder().encode(source).byteLength > MAX_SOURCE_BYTES) {
            return json({ error: "El código Lua supera el límite de 512 KiB." }, 413);
          }

          const input = binaryBase64 ? decodeBase64(binaryBase64) : source;
          const result = obfuscate(input, {
            seed: body.seed == null ? null : numberOption(body.seed, "seed", 0),
            antiLevel: numberOption(body.antiLevel, "antiLevel", 2),
            junkEvery: numberOption(body.junkEvery, "junkEvery", 5),
            superops: body.superops == null ? true : body.superops === true,
          });

          return json({ ok: true, ...result });
        } catch (error) {
          const message = error instanceof Error ? error.message : "No se pudo ofuscar la entrada.";
          return json({ ok: false, error: message }, 400);
        }
      },
    },
  },
});

export const API_LIMITS = {
  maxSourceBytes: MAX_SOURCE_BYTES,
  maxBinaryBytes: MAX_BINARY_BYTES,
  maxBodyBytes: MAX_BODY_BYTES,
};

export const API_EXAMPLE = {
  source: "print('hola')",
  antiLevel: 2,
  junkEvery: 5,
  superops: true,
};

