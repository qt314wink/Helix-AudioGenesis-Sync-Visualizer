import { ThumbsDown, ThumbsUp, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { STEMS } from "@/lib/audio/stems";
import type { ComposeMode, ScoreRecipe } from "@/lib/audio/types";
import { useHelix } from "@/lib/store";
import type { TrainingState } from "@/lib/training";
import { formatCountdown } from "@/lib/training";
import { VIZ_THEMES } from "@/lib/visualizer/themes";
import { cn } from "@/lib/utils";

export function FloatingPanel({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <aside
      className="absolute inset-x-3 bottom-28 z-20 max-h-[min(62dvh,560px)] overflow-y-auto rounded-2xl border border-border bg-surface p-4 shadow-[var(--shadow-panel)] sm:inset-x-auto sm:right-5 sm:bottom-28 sm:top-20 sm:max-h-none sm:w-[400px] sm:p-5"
      role="dialog"
      aria-label={title}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <h2 className="font-display text-xl italic text-fg">{title}</h2>
        <Button variant="ghost" size="icon-sm" aria-label="Close" onClick={onClose}>
          <X className="size-4" />
        </Button>
      </div>
      {children}
    </aside>
  );
}

export function SourcePanel({
  onPickAudio,
}: {
  onPickAudio: (file: File) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        Drop a track onto the stage, or choose a file. Play and pause from the
        dock. Sensitivity shapes how hard the picture leans on the signal.
      </p>
      <label className="flex h-28 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-border-strong bg-surface-2 text-sm text-muted hover:text-fg">
        Choose audio
        <input
          type="file"
          accept="audio/*"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onPickAudio(f);
          }}
        />
      </label>
    </div>
  );
}

export function GeneratePanel({
  onGenerate,
  onFeedback,
}: {
  onGenerate: (mode: ComposeMode, prompt: string, blendWith?: string, blend?: number) => void;
  onFeedback: (liked: boolean) => void;
}) {
  const { composeMode, generating, generateError, recipe, selectedStems, set } = useHelix();
  const [prompt, setPrompt] = useState("Rain on a closed harbor at 2am");
  const [blendWith, setBlendWith] = useState("dusty boom-bap");
  const [blend, setBlend] = useState(0.45);

  const modes: { id: ComposeMode; label: string }[] = [
    { id: "semantic", label: "Semantic" },
    { id: "artist", label: "Artist" },
    { id: "song", label: "Song" },
    { id: "blend", label: "Blend" },
  ];

  const placeholder =
    composeMode === "artist"
      ? "Agnes Obel, early Massive Attack"
      : composeMode === "song"
        ? "A climate, not a cover — e.g. midnight highway"
        : composeMode === "blend"
          ? "First climate"
          : "Fog, sodium lamps, a slow pulse";

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        Helix writes an original score from artist climate, song climate,
        semantic scene, or a blend. It never copies a recording.
      </p>
      <div className="flex gap-1 rounded-lg bg-surface-2 p-1">
        {modes.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => set({ composeMode: m.id })}
            className={cn(
              "h-9 flex-1 rounded-md text-xs font-medium transition-colors duration-150",
              composeMode === m.id ? "bg-surface text-fg" : "text-muted hover:text-fg",
            )}
          >
            {m.label}
          </button>
        ))}
      </div>
      <Input
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder={placeholder}
        aria-label="Compose prompt"
      />
      {composeMode === "blend" && (
        <>
          <Input
            value={blendWith}
            onChange={(e) => setBlendWith(e.target.value)}
            placeholder="Second climate"
            aria-label="Blend with"
          />
          <div>
            <div className="mb-1 flex justify-between text-xs text-muted">
              <span>Toward first</span>
              <span>Toward second</span>
            </div>
            <Slider
              min={0}
              max={1}
              step={0.01}
              value={[blend]}
              onValueChange={(v) => setBlend(v[0] ?? 0.5)}
            />
          </div>
        </>
      )}
      <div>
        <p className="mb-2 text-xs font-medium text-muted">Stem influence</p>
        <div className="flex flex-wrap gap-1.5">
          {STEMS.map((stem) => {
            const on = selectedStems.includes(stem.id);
            return (
              <button
                key={stem.id}
                type="button"
                onClick={() =>
                  set({
                    selectedStems: on
                      ? selectedStems.filter((id) => id !== stem.id)
                      : [...selectedStems, stem.id],
                  })
                }
                className={cn(
                  "h-8 rounded-full border px-3 text-xs transition-colors duration-150",
                  on
                    ? "border-accent bg-accent text-accent-fg"
                    : "border-border text-muted hover:text-fg",
                )}
              >
                {stem.name}
              </button>
            );
          })}
        </div>
      </div>
      <Button
        disabled={generating || prompt.trim().length < 2}
        onClick={() =>
          onGenerate(
            composeMode,
            prompt,
            composeMode === "blend" ? blendWith : undefined,
            composeMode === "blend" ? blend : undefined,
          )
        }
      >
        {generating ? "Composing…" : "Compose score"}
      </Button>
      {generateError && <p className="text-sm text-danger">{generateError}</p>}
      {recipe && <RecipeCard key={recipe.id} recipe={recipe} onFeedback={onFeedback} />}
    </div>
  );
}

function RecipeCard({
  recipe,
  onFeedback,
}: {
  recipe: ScoreRecipe;
  onFeedback: (liked: boolean) => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface-2 p-3">
      <p className="text-sm font-medium text-fg">{recipe.title}</p>
      <p className="mt-1 font-mono text-xs text-muted tabular-nums">
        {recipe.bpm} BPM · {recipe.key} {recipe.scale} · {recipe.styles.join(" / ")}
      </p>
      <p className="mt-2 text-sm text-muted">{recipe.rationale}</p>
      <div className="mt-3 flex gap-2">
        <Button variant="secondary" size="sm" onClick={() => onFeedback(true)}>
          <ThumbsUp className="size-3.5" /> Keep
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onFeedback(false)}>
          <ThumbsDown className="size-3.5" /> Discard climate
        </Button>
      </div>
    </div>
  );
}

export function SyncPanel({
  onPickVideo,
  onPickTrack,
}: {
  onPickVideo: (file: File) => void;
  onPickTrack: (file: File) => void;
}) {
  const { videoName, fileName, syncOffset, set } = useHelix();
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        Picture and sound, locked. Upload a video and a separate track, then
        slide the offset until the cut hits the downbeat. If you only bring
        video, Helix reads its soundtrack.
      </p>
      <FileSlot label="Video" name={videoName} accept="video/*" onPick={onPickVideo} />
      <FileSlot label="Track" name={fileName} accept="audio/*" onPick={onPickTrack} />
      <div>
        <div className="mb-1 flex justify-between text-xs text-muted">
          <span>Video offset</span>
          <span className="font-mono tabular-nums">
            {syncOffset > 0 ? "+" : ""}
            {syncOffset.toFixed(2)}s
          </span>
        </div>
        <Slider
          min={-2.5}
          max={2.5}
          step={0.01}
          value={[syncOffset]}
          onValueChange={(v) => set({ syncOffset: v[0] ?? 0 })}
          aria-label="Video offset"
        />
      </div>
    </div>
  );
}

function FileSlot({
  label,
  name,
  accept,
  onPick,
}: {
  label: string;
  name: string | null;
  accept: string;
  onPick: (file: File) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between rounded-lg border border-border bg-surface-2 px-3 py-3 text-sm hover:border-border-strong">
      <span className="text-muted">{label}</span>
      <span className="max-w-[60%] truncate text-fg">{name ?? "Choose file"}</span>
      <input
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPick(f);
        }}
      />
    </label>
  );
}

export function LookPanel() {
  const { themeId, smoothness, volume, set } = useHelix();
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">Color of the picture. Chrome stays quiet.</p>
      <div className="grid grid-cols-2 gap-2">
        {VIZ_THEMES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => set({ themeId: t.id })}
            className={cn(
              "flex h-12 items-center gap-2 rounded-lg border px-3 text-sm",
              themeId === t.id ? "border-accent text-fg" : "border-border text-muted",
            )}
          >
            <span
              className="size-4 rounded-full"
              style={{ background: `rgb(${t.mid.join(",")})` }}
            />
            {t.name}
          </button>
        ))}
      </div>
      <div>
        <p className="mb-1 text-xs text-muted">Smoothness</p>
        <Slider
          min={0.08}
          max={0.45}
          step={0.01}
          value={[smoothness]}
          onValueChange={(v) => set({ smoothness: v[0] ?? 0.22 })}
        />
      </div>
      <div>
        <p className="mb-1 text-xs text-muted">Volume</p>
        <Slider
          min={0}
          max={1}
          step={0.01}
          value={[volume]}
          onValueChange={(v) => set({ volume: v[0] ?? 0.85 })}
        />
      </div>
    </div>
  );
}

export function ForgePanel({
  training,
  onToggleObserve,
  onPreviewStem,
}: {
  training: TrainingState;
  onToggleObserve: () => void;
  onPreviewStem: (id: string) => void;
}) {
  const until = useMemo(
    () => formatCountdown(training.nextNightlyAt - Date.now()),
    [training.nextNightlyAt],
  );
  const latestDaily = training.dailyRuns[0];
  const latestPatch = training.weeklyPatches[0];

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-muted">
        Helix-R trains on community stems and your listening. Nightly recursive
        passes ingest observations and feedback. Daily runs fold into a weekly
        patch — an upgrade pack applied on-device.
      </p>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <Stat label="Model" value={training.modelVersion} />
        <Stat label="Stems" value={String(training.stemCount)} />
        <Stat label="Nightly" value={until} />
        <Stat label="Feedback" value={String(training.feedback.length)} />
      </dl>
      <div>
        <p className="mb-1 text-xs font-medium text-muted">Latest daily</p>
        <p className="text-sm text-fg">{latestDaily?.notes}</p>
      </div>
      <div>
        <p className="mb-1 text-xs font-medium text-muted">Weekly patch</p>
        <p className="text-sm text-fg">
          {latestPatch?.version} · {latestPatch?.notes}
        </p>
      </div>
      <label className="flex items-center justify-between gap-3 text-sm">
        <span className="text-muted">Observe interactions</span>
        <button
          type="button"
          role="switch"
          aria-checked={training.observationEnabled}
          onClick={onToggleObserve}
          className={cn(
            "h-7 w-11 rounded-full transition-colors duration-150",
            training.observationEnabled ? "bg-accent" : "bg-surface-2",
          )}
        >
          <span
            className={cn(
              "block size-5 translate-x-1 rounded-full bg-fg transition-transform duration-150",
              training.observationEnabled && "translate-x-5",
            )}
          />
        </button>
      </label>
      <div>
        <p className="mb-2 text-xs font-medium text-muted">Community stems</p>
        <ul className="flex flex-col gap-1">
          {STEMS.map((stem) => (
            <li key={stem.id}>
              <button
                type="button"
                onClick={() => onPreviewStem(stem.id)}
                className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left hover:bg-surface-2"
              >
                <span className="text-sm text-fg">{stem.name}</span>
                <span className="font-mono text-xs text-muted">
                  {stem.contributor} · {stem.kind}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      {training.observations.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium text-muted">Recent ingestion</p>
          <ul className="flex flex-col gap-1">
            {training.observations.slice(0, 5).map((o) => (
              <li key={o.t} className="flex justify-between gap-2 text-xs text-muted">
                <span>{o.event}</span>
                <span className="truncate">{o.detail}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-surface-2 px-3 py-2">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="font-mono text-sm text-fg tabular-nums">{value}</dd>
    </div>
  );
}
