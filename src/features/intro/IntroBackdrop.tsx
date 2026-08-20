export function IntroBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-[0.14] mix-blend-luminosity motion-safe:animate-[wb-intro-drift_28s_ease-in-out_infinite]"
        style={{ backgroundImage: "url(/intro-bg.jpg)" }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_-10%,transparent_20%,var(--background)_75%)]" />
      <div className="absolute -inset-1/4 bg-[radial-gradient(45%_45%_at_30%_35%,color-mix(in_srgb,var(--brand)_16%,transparent),transparent_70%)] motion-safe:animate-[wb-intro-glow_18s_ease-in-out_infinite]" />
    </div>
  );
}
