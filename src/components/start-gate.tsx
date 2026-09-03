import { Button } from "@/components/ui/button";

export function StartGate({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center px-6 text-center">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,transparent_40%,var(--color-bg)_100%)]" />
      <div className="relative flex max-w-xl flex-col items-center gap-6">
        <p className="text-xs font-medium tracking-[0.22em] text-muted uppercase">
          Visualizer · Studio · Trainer
        </p>
        <h1 className="font-display text-3xl leading-tight tracking-[-0.03em] italic text-fg">
          Helix
        </h1>
        <p className="max-w-md text-base text-muted">
          Listen through a microphone, a file, or a generated score. Overlay a
          video and lock it to the track. Community stems train on-device,
          nightly, into weekly patches.
        </p>
        <Button size="lg" onClick={onEnter} className="min-w-40 rounded-lg">
          Enter
        </Button>
        <p className="font-mono text-xs text-subtle tabular-nums">R7.3 · on-device</p>
      </div>
    </div>
  );
}
