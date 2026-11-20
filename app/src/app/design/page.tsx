import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Metadata } from "next";
import { DesignPlayground } from "./DesignPlayground";

export const metadata: Metadata = { title: "Sistema de diseño · Hitzez" };

type TokenFile = { color: Record<string, string>; type: Record<string, { size: number; line: number; weight: number }> };

function readTokens(): TokenFile {
  const path = resolve(process.cwd(), "../replica/design/tokens.json");
  return JSON.parse(readFileSync(path, "utf8")) as TokenFile;
}

export default function DesignPage() {
  const tokens = readTokens();
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-14 px-6 py-12">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-semibold tracking-wide text-accent uppercase">Sistema de diseño</p>
        <h1 className="text-xl">Componentes base del editor</h1>
        <p className="max-w-2xl text-text-muted">
          Todo sale de <code className="font-mono text-sm">replica/design/tokens.json</code>. Los colores son
          provisionales: <code className="font-mono text-sm">/replica-brand</code> pondrá los definitivos.
        </p>
      </header>

      <section aria-labelledby="colors" className="flex flex-col gap-4">
        <h2 id="colors" className="text-lg">
          Colores por función
        </h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {Object.entries(tokens.color).map(([name, hex]) => (
            <li key={name} className="flex flex-col gap-1.5">
              <span
                className="h-12 rounded-md border border-border"
                style={{ backgroundColor: `var(--color-${name})` }}
              />
              <span className="text-xs font-semibold">{name}</span>
              <span className="font-mono text-xs text-text-muted">{hex}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="type" className="flex flex-col gap-4">
        <h2 id="type" className="text-lg">
          Tipografía
        </h2>
        <dl className="flex flex-col gap-3">
          {Object.entries(tokens.type).map(([name, t]) => (
            <div key={name} className="flex items-baseline gap-6 border-b border-border pb-3">
              <dt className="w-28 shrink-0 font-mono text-xs text-text-muted">
                {name} · {t.size}/{t.line}
              </dt>
              <dd className={name === "transcript" ? "font-transcript text-transcript" : `text-${name}`}>
                {name === "transcript"
                  ? "Bienvenidos a un nuevo episodio desde Oñati."
                  : "Edita el audio editando el texto"}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <DesignPlayground />
    </main>
  );
}
