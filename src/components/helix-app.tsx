import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import { Dock, TopChrome } from "@/components/hud";
import {
  FloatingPanel,
  ForgePanel,
  GeneratePanel,
  LookPanel,
  SourcePanel,
  SyncPanel,
} from "@/components/panels";
import { StartGate } from "@/components/start-gate";
import { createEngine, getEngine, type HelixEngine } from "@/lib/audio/engine";
import { DEMO_RECIPE, recipeFromStems, STEMS } from "@/lib/audio/stems";
import type { ComposeMode, ScoreRecipe } from "@/lib/audio/types";
import { composeScore } from "@/lib/compose";
import { useHelix, type PanelId, type SourceMode } from "@/lib/store";
import {
  loadTraining,
  recordFeedback,
  recordObservation,
  runNightlyIfDue,
  saveTraining,
  type TrainingState,
} from "@/lib/training";
import { cn } from "@/lib/utils";
import { fillIdleSpectrum, HelixRenderer, type VizMode } from "@/lib/visualizer/renderer";
import { VIZ_THEMES } from "@/lib/visualizer/themes";

const PREFS_KEY = "helix.prefs.v1";
const VIZ_MODE_KEYS: VizMode[] = ["bars", "circular", "radial", "wave", "bloom"];

export function HelixApp() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const engineRef = useRef<HelixEngine | null>(null);
  const audioUrl = useRef<string | null>(null);
  const videoUrl = useRef<string | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [training, setTraining] = useState<TrainingState | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const {
    entered,
    isPlaying,
    source,
    panel,
    volume,
    syncOffset,
    videoName,
    hudVisible,
    set,
  } = useHelix();

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PREFS_KEY);
      if (!raw) return;
      const p = JSON.parse(raw) as Partial<{
        vizMode: VizMode;
        themeId: string;
        sensitivity: number;
        smoothness: number;
        volume: number;
      }>;
      const patch: {
        vizMode?: VizMode;
        themeId?: string;
        sensitivity?: number;
        smoothness?: number;
        volume?: number;
      } = {};
      if (p.vizMode && VIZ_MODE_KEYS.includes(p.vizMode)) patch.vizMode = p.vizMode;
      if (p.themeId && VIZ_THEMES.some((t) => t.id === p.themeId)) patch.themeId = p.themeId;
      if (typeof p.sensitivity === "number") patch.sensitivity = p.sensitivity;
      if (typeof p.smoothness === "number") patch.smoothness = p.smoothness;
      if (typeof p.volume === "number") patch.volume = p.volume;
      if (Object.keys(patch).length) set(patch);
    } catch {
      /* ignore */
    }
    setTraining(runNightlyIfDue(loadTraining()));
  }, [set]);

  useEffect(() => {
    if (!entered) return;
    const unsub = useHelix.subscribe((s) => {
      try {
        localStorage.setItem(
          PREFS_KEY,
          JSON.stringify({
            vizMode: s.vizMode,
            themeId: s.themeId,
            sensitivity: s.sensitivity,
            smoothness: s.smoothness,
            volume: s.volume,
          }),
        );
      } catch {
        /* ignore */
      }
    });
    return unsub;
  }, [entered]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = new HelixRenderer(canvas);
    renderer.resize();
    const onResize = () => renderer.resize();
    const ro = new ResizeObserver(() => renderer.resize());
    ro.observe(canvas);
    window.addEventListener("resize", onResize);
    let raf = 0;
    let last = performance.now();
    const idleFreq = new Uint8Array(1024);
    const idleTime = new Uint8Array(2048);
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const s = useHelix.getState();
      const theme = VIZ_THEMES.find((t) => t.id === s.themeId) ?? VIZ_THEMES[0]!;
      const engine = engineRef.current;
      let freq: Uint8Array;
      let time: Uint8Array;
      if (engine && s.entered) {
        const sample = engine.sample();
        freq = sample.freq;
        time = sample.time;
        engine.syncClock();
      } else {
        fillIdleSpectrum(idleFreq, idleTime, now / 1000);
        freq = idleFreq;
        time = idleTime;
      }
      renderer.hasVideo = Boolean(s.videoName) && (s.source === "sync" || Boolean(videoRef.current?.src));
      renderer.draw(freq, time, s.vizMode, theme, s.sensitivity, s.smoothness, dt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      ro.disconnect();
    };
  }, []);

  useEffect(() => {
    getEngine()?.setVolume(volume);
  }, [volume]);

  useEffect(() => {
    const engine = getEngine();
    if (engine) engine.syncOffset = syncOffset;
  }, [syncOffset]);

  useEffect(() => {
    if (!entered) return;
    let hide = 0;
    const bump = () => {
      set({ hudVisible: true });
      window.clearTimeout(hide);
      hide = window.setTimeout(() => {
        if (!useHelix.getState().panel) set({ hudVisible: false });
      }, 2800);
    };
    window.addEventListener("mousemove", bump, { passive: true });
    window.addEventListener("touchstart", bump, { passive: true });
    bump();
    return () => {
      window.removeEventListener("mousemove", bump);
      window.removeEventListener("touchstart", bump);
      window.clearTimeout(hide);
    };
  }, [entered, set]);

  const observe = useCallback((event: string, detail: string) => {
    setTraining((prev) => {
      if (!prev) return prev;
      return recordObservation(prev, event, detail);
    });
  }, []);

  const flash = useCallback((msg: string) => {
    setNotice(msg);
    window.setTimeout(() => setNotice(null), 3200);
  }, []);

  const ensureEngine = useCallback(async () => {
    if (!engineRef.current) engineRef.current = createEngine();
    await engineRef.current.resume();
    engineRef.current.setVolume(useHelix.getState().volume);
    return engineRef.current;
  }, []);

  const playRecipe = useCallback(
    async (next: ScoreRecipe, metaExtra?: string) => {
      const engine = await ensureEngine();
      engine.playRecipe(next);
      set({
        entered: true,
        isPlaying: true,
        source: "generate",
        recipe: next,
        nowPlaying: {
          title: next.title,
          meta: `${next.bpm} BPM · ${next.key} ${next.scale}${metaExtra ? ` · ${metaExtra}` : ""}`,
        },
      });
    },
    [ensureEngine, set],
  );

  const enter = useCallback(async () => {
    await playRecipe(DEMO_RECIPE, DEMO_RECIPE.styles.join(" / "));
    observe("enter", "session");
  }, [observe, playRecipe]);

  const togglePlay = useCallback(async () => {
    const engine = await ensureEngine();
    const s = useHelix.getState();
    if (s.isPlaying) {
      engine.pauseMedia();
      set({ isPlaying: false });
      return;
    }
    engine.playMedia();
    set({ isPlaying: true, entered: true });
  }, [ensureEngine, set]);

  const startMic = useCallback(async () => {
    try {
      const engine = await ensureEngine();
      await engine.startMic();
      set({
        entered: true,
        isPlaying: true,
        source: "mic",
        panel: null,
        nowPlaying: { title: "Microphone", meta: "Live input" },
      });
      observe("source", "mic");
    } catch {
      flash("Microphone needs permission in this browser.");
    }
  }, [ensureEngine, flash, observe, set]);

  const assignAudio = useCallback((file: File) => {
    const el = audioRef.current;
    if (!el) return;
    if (audioUrl.current) URL.revokeObjectURL(audioUrl.current);
    const url = URL.createObjectURL(file);
    audioUrl.current = url;
    el.src = url;
    el.load();
    set({ fileName: file.name });
    return el;
  }, [set]);

  const assignVideo = useCallback((file: File) => {
    const el = videoRef.current;
    if (!el) return;
    if (videoUrl.current) URL.revokeObjectURL(videoUrl.current);
    const url = URL.createObjectURL(file);
    videoUrl.current = url;
    el.src = url;
    el.load();
    set({ videoName: file.name });
    return el;
  }, [set]);

  const playFile = useCallback(
    async (file: File) => {
      const el = assignAudio(file);
      if (!el) return;
      const engine = await ensureEngine();
      engine.connectFile(el);
      try {
        await el.play();
      } catch {
        /* autoplay */
      }
      set({
        entered: true,
        isPlaying: true,
        source: "file",
        panel: null,
        nowPlaying: { title: file.name.replace(/\.[^.]+$/, ""), meta: "Uploaded track" },
      });
      observe("source", "file");
    },
    [assignAudio, ensureEngine, observe, set],
  );

  const applySync = useCallback(async () => {
    const audio = audioRef.current;
    const video = videoRef.current;
    const s = useHelix.getState();
    const hasAudio = Boolean(s.fileName && audio?.src);
    const hasVideo = Boolean(s.videoName && video?.src);
    if (!hasAudio && !hasVideo) {
      flash("Add a video, a track, or both.");
      return;
    }
    const engine = await ensureEngine();
    engine.syncOffset = s.syncOffset;
    engine.connectSync(hasAudio ? audio : null, hasVideo ? video : null, !hasAudio);
    engine.playMedia();
    const title = s.videoName?.replace(/\.[^.]+$/, "") ?? s.fileName ?? "Sync";
    set({
      entered: true,
      isPlaying: true,
      source: "sync",
      nowPlaying: {
        title,
        meta: hasAudio && hasVideo ? "Picture locked to track" : hasVideo ? "Video soundtrack" : "Track only",
      },
    });
    observe("source", "sync");
  }, [ensureEngine, flash, observe, set]);

  const pickVideo = useCallback(
    async (file: File) => {
      const el = assignVideo(file);
      set({ panel: "sync" });
      if (!el) return;
      if (el.readyState >= 2) void applySync();
      else el.addEventListener("loadeddata", () => void applySync(), { once: true });
    },
    [applySync, assignVideo, set],
  );

  const pickSyncTrack = useCallback(
    async (file: File) => {
      const el = assignAudio(file);
      if (!el) return;
      if (el.readyState >= 2) void applySync();
      else el.addEventListener("loadeddata", () => void applySync(), { once: true });
    },
    [applySync, assignAudio],
  );

  const onGenerate = useCallback(
    async (mode: ComposeMode, prompt: string, blendWith?: string, blend?: number) => {
      set({ generating: true, generateError: null, panel: "generate" });
      try {
        const res = await composeScore({
          data: {
            mode,
            prompt,
            blendWith,
            blend,
            stemIds: useHelix.getState().selectedStems,
            weights: training?.weights,
          },
        });
        if (!res.recipe) {
          set({ generating: false, generateError: "Could not compose that climate." });
          return;
        }
        await playRecipe(res.recipe, res.recipe.styles.join(" / "));
        set({ generating: false, panel: "generate" });
        observe("compose", `${mode}:${res.recipe.title}`);
      } catch (err) {
        set({
          generating: false,
          generateError: err instanceof Error ? err.message : "Could not compose that climate.",
        });
      }
    },
    [observe, playRecipe, set, training?.weights],
  );

  const onFeedback = useCallback(
    (liked: boolean) => {
      const current = useHelix.getState().recipe;
      if (!current || !training) return;
      const next = recordFeedback(training, current, liked);
      setTraining(next);
      flash(liked ? "Kept. Weights shifted toward this climate." : "Discarded. Trainer will lean away.");
      observe("feedback", liked ? `keep:${current.title}` : `discard:${current.title}`);
    },
    [flash, observe, training],
  );

  const onPreviewStem = useCallback(
    async (id: string) => {
      const stem = STEMS.find((s) => s.id === id);
      if (!stem) return;
      const patch = recipeFromStems([id], stem.name);
      const next: ScoreRecipe = {
        ...DEMO_RECIPE,
        ...patch,
        id: `stem-${id}`,
        title: stem.name,
        styles: stem.styles,
        stemIds: [id],
        rationale: `Preview of ${stem.name} from ${stem.contributor}.`,
      };
      await playRecipe(next, `${stem.contributor} · ${stem.kind}`);
      observe("stem", id);
    },
    [observe, playRecipe],
  );

  const toggleObserve = useCallback(() => {
    setTraining((prev) => {
      if (!prev) return prev;
      const next = { ...prev, observationEnabled: !prev.observationEnabled };
      saveTraining(next);
      return next;
    });
  }, []);

  const togglePanel = useCallback(
    (id: PanelId) => {
      const open = useHelix.getState().panel === id ? null : id;
      set({ panel: open, hudVisible: true });
    },
    [set],
  );

  const toggleFullscreen = useCallback(async () => {
    const root = stageRef.current;
    if (!root) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        set({ fullscreen: false });
      } else {
        await root.requestFullscreen();
        set({ fullscreen: true });
      }
    } catch {
      flash("Fullscreen is not available here.");
    }
  }, [flash, set]);

  useEffect(() => {
    const onFs = () => set({ fullscreen: Boolean(document.fullscreenElement) });
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, [set]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (e.key === "Escape") {
        if (useHelix.getState().panel) set({ panel: null });
        return;
      }
      if (typing) return;
      if (!useHelix.getState().entered) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          void enter();
        }
        return;
      }
      if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        void togglePlay();
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        void toggleFullscreen();
      } else if (e.key >= "1" && e.key <= "5") {
        const mode = VIZ_MODE_KEYS[Number(e.key) - 1];
        if (mode) set({ vizMode: mode });
      } else if (e.key === "m" || e.key === "M") {
        void startMic();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enter, set, startMic, toggleFullscreen, togglePlay]);

  const onDragOver = (e: DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };
  const onDragLeave = () => setDragging(false);
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const files = [...e.dataTransfer.files];
    const video = files.find((f) => f.type.startsWith("video/") || /\.(mp4|webm|mov|mkv)$/i.test(f.name));
    const audio = files.find((f) => f.type.startsWith("audio/") || /\.(mp3|wav|flac|ogg|m4a|aac)$/i.test(f.name));
    if (video && audio) {
      assignVideo(video);
      assignAudio(audio);
      set({ panel: "sync" });
      window.setTimeout(() => void applySync(), 80);
    } else if (video) {
      void pickVideo(video);
    } else if (audio) {
      void playFile(audio);
    }
  };

  const showVideo = Boolean(videoName) && source === "sync";

  const panelTitle =
    panel === "source"
      ? "Track"
      : panel === "generate"
        ? "Compose"
        : panel === "sync"
          ? "Picture lock"
          : panel === "forge"
            ? "Forge"
            : panel === "look"
              ? "Look"
              : "";

  return (
    <div
      ref={stageRef}
      className={cn(
        "relative h-dvh overflow-hidden bg-bg text-fg",
        entered && !hudVisible && isPlaying && "cursor-none",
      )}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={(e) => {
        if (!entered) return;
        set({ hudVisible: true });
        if (e.target === e.currentTarget && panel) set({ panel: null });
      }}
    >
      <video
        ref={videoRef}
        className={cn(
          "pointer-events-none absolute inset-0 h-full w-full object-cover transition-opacity duration-fast",
          showVideo ? "opacity-100" : "opacity-0",
        )}
        playsInline
        loop
        preload="auto"
        aria-hidden={!showVideo}
      />
      {showVideo && <div className="pointer-events-none absolute inset-0 bg-bg/55" />}
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />
      <audio ref={audioRef} className="hidden" loop preload="auto" />

      {dragging && (
        <div className="absolute inset-0 z-40 flex items-center justify-center border-2 border-dashed border-accent/40 bg-bg/70">
          <p className="font-display text-2xl italic text-fg">Drop a track or video</p>
        </div>
      )}

      {!entered && <StartGate onEnter={() => void enter()} />}

      {entered && (
        <>
          <TopChrome
            modelVersion={training?.modelVersion ?? "R7.3"}
            onFullscreen={() => void toggleFullscreen()}
            onLook={() => togglePanel("look")}
          />
          {panel && (
            <FloatingPanel title={panelTitle} onClose={() => set({ panel: null })}>
              {panel === "source" && <SourcePanel onPickAudio={(f) => void playFile(f)} />}
              {panel === "generate" && (
                <GeneratePanel onGenerate={(m, p, b, n) => void onGenerate(m, p, b, n)} onFeedback={onFeedback} />
              )}
              {panel === "sync" && (
                <SyncPanel
                  onPickVideo={(f) => void pickVideo(f)}
                  onPickTrack={(f) => void pickSyncTrack(f)}
                />
              )}
              {panel === "look" && <LookPanel />}
              {panel === "forge" && training && (
                <ForgePanel
                  training={training}
                  onToggleObserve={toggleObserve}
                  onPreviewStem={(id) => void onPreviewStem(id)}
                />
              )}
            </FloatingPanel>
          )}
          <Dock
            onPlay={() => void togglePlay()}
            onPanel={togglePanel}
            onSource={(s: SourceMode) => {
              if (s === "mic") void startMic();
            }}
          />
        </>
      )}

      {notice && (
        <div
          role="status"
          aria-live="polite"
          className="absolute left-1/2 top-16 z-30 -translate-x-1/2 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg shadow-[var(--shadow-panel)]"
        >
          {notice}
        </div>
      )}
    </div>
  );
}
