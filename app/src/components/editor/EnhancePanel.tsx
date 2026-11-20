"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setEnhanceAction } from "@/app/actions";
import { Notice } from "@/components/ui/feedback";
import { Slider, Switch } from "@/components/ui/form-controls";
import type { EnhanceSettings } from "@/lib/data/projects";

type EnhancePanelProps = {
  projectId: string;
  settings: EnhanceSettings;
  hasAudio: boolean;
  isReady: boolean;
  isListeningOriginal: boolean;
  onListenOriginalChange: (value: boolean) => void;
};

/** S09: turn voice enhancement on, choose its strength and compare with the original. */
export function EnhancePanel({ projectId, settings, hasAudio, isReady, isListeningOriginal, onListenOriginalChange }: EnhancePanelProps) {
  const [enabled, setEnabled] = useState(settings.enabled);
  const [strength, setStrength] = useState(settings.strength);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();
  const router = useRouter();

  const save = (next: EnhanceSettings) => {
    setError(null);
    startSaving(async () => {
      const ok = await setEnhanceAction(projectId, next).catch(() => false);
      if (!ok) setError("No se pudo guardar el ajuste. Inténtalo otra vez.");
      router.refresh();
    });
  };

  const status = !enabled
    ? "Desactivada: escuchas y exportas el audio tal como se grabó."
    : !hasAudio
      ? "Se aplicará cuando subas o grabes audio."
      : isSaving || !isReady
        ? "Aplicando la mejora… (unos segundos por cada minuto de audio)"
        : isListeningOriginal
          ? "Lista. Ahora escuchas el original para comparar."
          : "Lista: escuchas y exportas la voz mejorada.";

  return (
    <div className="flex flex-col gap-5">
      <Switch
        label="Mejorar la voz"
        checked={enabled}
        onCheckedChange={(value) => {
          setEnabled(value);
          save({ enabled: value, strength });
        }}
      />
      <Slider
        label="Intensidad"
        value={strength}
        onValueChange={setStrength}
        onValueCommit={(value) => save({ enabled, strength: value })}
        disabled={!enabled}
      />
      <p role="status" className="text-xs text-text-muted">
        {status}
      </p>
      {enabled && isReady && (
        <Switch label="Escuchar el original" checked={isListeningOriginal} onCheckedChange={onListenOriginalChange} />
      )}
      <div className="flex flex-col gap-2 border-t border-border pt-4 text-xs text-text-muted">
        <p className="font-semibold text-text">Qué hace</p>
        <ul className="list-disc space-y-1 pl-4">
          <li>Quita el ruido de fondo constante (ventilador, zumbido, ambiente) y lo baja aún más en las pausas.</li>
          <li>Quita retumbes graves, limpia el «barro» de la voz, le da presencia y suaviza las eses.</li>
          <li>Iguala el volumen y lo deja en −16 LUFS, el nivel habitual de los podcasts.</li>
        </ul>
        <p>Con 0 solo se iguala el volumen. Si la voz suena artificial, baja la intensidad.</p>
      </div>
      {error && (
        <Notice tone="error" title="Mejora de voz">
          {error}
        </Notice>
      )}
    </div>
  );
}
