import {
  Aperture,
  AudioLines,
  CircleDashed,
  Maximize,
  Mic,
  Minimize,
  Orbit,
  Palette,
  Pause,
  Play,
  Repeat,
  Upload,
  Waves,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { getEngine } from "@/lib/audio/engine";
import { useHelix, type PanelId, type SourceMode } from "@/lib/store";
import type { VizMode } from "@/lib/visualizer/renderer";
import { cn } from "@/lib/utils";

const MODES: { id: VizMode; label: string; icon: typeof AudioLines }[] = [
  { id: "bars", label: "Bars", icon: AudioLines },
  { id: "circular", label: "Circular", icon: CircleDashed },
  { id: "radial", label: "Radial", icon: Aperture },
  { id: "wave", label: "Wave", icon: Waves },
  { id: "bloom", label: "Bloom", icon: Orbit },
];

export function TopChrome({
  modelVersion,
  onFullscreen,
  onLook,
}: {
  modelVersion: string;
  onFullscreen: () => void;
  onLook: () => void;
}) {
  const { hudVisible, nowPlaying, fullscreen, panel } = useHelix();
  const show = hudVisible || panel !== null || !nowPlaying;
  return (
    <header
      className={cn(
        "pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between px-4 pt-4 sm:px-6 sm:pt-5",
        "transition-opacity duration-fast ease-out",
        show ? "opacity-100" : "opacity-0",
      )}
    >
      <div className="pointer-events-auto">
        <p className="font-display text-xl italic leading-none text-fg">Helix</p>
        <p className="mt-1 font-mono text-xs text-muted tabular-nums">{modelVersion}</p>
      </div>
      <div className="pointer-events-auto flex items-center gap-2">
        {nowPlaying && (
          <div className="hidden max-w-xs rounded-lg border border-border bg-surface/90 px-3 py-2 sm:block">
            <p className="truncate text-sm font-medium text-fg">{nowPlaying.title}</p>
            <p className="truncate font-mono text-xs text-muted">{nowPlaying.meta}</p>
          </div>
        )}
        <Button variant="ghost" size="icon" aria-label="Look" onClick={onLook}>
          <Palette className="size-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          onClick={onFullscreen}
        >
          {fullscreen ? <Minimize className="size-5" /> : <Maximize className="size-5" />}
        </Button>
      </div>
    </header>
  );
}

export function Dock({
  onPlay,
  onPanel,
  onSource,
}: {
  onPlay: () => void;
  onPanel: (id: PanelId) => void;
  onSource: (s: SourceMode) => void;
}) {
  const { hudVisible, isPlaying, source, vizMode, sensitivity, panel, nowPlaying, set } = useHelix();
  const show = hudVisible || panel !== null || !isPlaying;
  const showSeek = source === "file" || source === "sync";

  return (
    <div
      className={cn(
        "absolute inset-x-0 bottom-0 z-10 px-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-5 sm:pb-5",
        "transition-opacity duration-fast ease-out",
        show ? "opacity-100" : "opacity-0",
      )}
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-2 rounded-2xl border border-border bg-surface/92 p-2 shadow-[var(--shadow-panel)] sm:px-3 sm:py-2">
        {showSeek && <MediaProgress />}
        {nowPlaying && (
          <p className="truncate px-2 text-xs text-muted sm:hidden">{nowPlaying.title}</p>
        )}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label={isPlaying ? "Pause" : "Play"}
              onClick={onPlay}
            >
              {isPlaying ? <Pause className="size-5" /> : <Play className="size-5" />}
            </Button>
            <IconToggle
              active={source === "mic"}
              label="Microphone"
              onClick={() => onSource("mic")}
            >
              <Mic className="size-4" />
            </IconToggle>
            <IconToggle
              active={source === "file"}
              label="Upload track"
              onClick={() => onPanel("source")}
            >
              <Upload className="size-4" />
            </IconToggle>
            <IconToggle
              active={panel === "generate" || source === "generate"}
              label="Generate"
              onClick={() => onPanel("generate")}
            >
              <AudioLines className="size-4" />
            </IconToggle>
            <IconToggle
              active={panel === "sync" || source === "sync"}
              label="Video sync"
              onClick={() => onPanel("sync")}
            >
              <Waves className="size-4" />
            </IconToggle>
            <IconToggle
              active={panel === "forge"}
              label="Forge trainer"
              onClick={() => onPanel("forge")}
            >
              <Repeat className="size-4" />
            </IconToggle>
          </div>

          <div className="hidden h-8 w-px bg-border sm:block" />

          <div className="flex flex-1 items-center gap-1 overflow-x-auto">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                aria-label={m.label}
                aria-pressed={vizMode === m.id}
                onClick={() => set({ vizMode: m.id })}
                className={cn(
                  "inline-flex size-11 items-center justify-center rounded-md text-muted transition-colors duration-quick",
                  vizMode === m.id ? "bg-surface-2 text-fg" : "hover:text-fg",
                )}
              >
                <m.icon className="size-4" />
              </button>
            ))}
          </div>

          <div className="flex min-w-0 flex-1 items-center gap-3 px-2">
            <span className="hidden text-xs text-muted sm:inline">Sense</span>
            <Slider
              min={0.3}
              max={2.4}
              step={0.02}
              value={[sensitivity]}
              onValueChange={(v) => set({ sensitivity: v[0] ?? 1 })}
              aria-label="Sensitivity"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function fmtTime(s: number) {
  if (!Number.isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function MediaProgress() {
  const [t, setT] = useState(0);
  const [d, setD] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      const engine = getEngine();
      if (!engine) return;
      setT(engine.mediaCurrentTime);
      setD(engine.mediaDuration);
    }, 200);
    return () => window.clearInterval(id);
  }, []);

  if (d <= 0) return null;

  return (
    <div className="flex items-center gap-3 px-2 pt-1">
      <span className="w-10 font-mono text-xs text-muted tabular-nums">{fmtTime(t)}</span>
      <Slider
        min={0}
        max={d}
        step={0.05}
        value={[Math.min(t, d)]}
        onValueChange={(v) => getEngine()?.seek(v[0] ?? 0)}
        aria-label="Seek"
      />
      <span className="w-10 text-right font-mono text-xs text-muted tabular-nums">{fmtTime(d)}</span>
    </div>
  );
}

function IconToggle({
  active,
  label,
  onClick,
  children,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex size-11 items-center justify-center rounded-md transition-colors duration-quick",
        active ? "bg-accent text-accent-fg" : "text-muted hover:text-fg hover:bg-surface-2",
      )}
    >
      {children}
    </button>
  );
}
