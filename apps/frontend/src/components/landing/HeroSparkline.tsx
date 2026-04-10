type Props = { className?: string };

export function HeroSparkline({ className }: Props) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 520 300"
      fill="none"
    >
      <defs>
        <linearGradient id="hero-spark-stroke" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#a7f3d0" />
        </linearGradient>
        <linearGradient id="hero-spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M 0 240 C 60 220, 90 230, 130 200 S 200 150, 240 160 S 320 120, 360 90 S 440 60, 520 30 L 520 300 L 0 300 Z"
        fill="url(#hero-spark-fill)"
      />
      <path
        d="M 0 240 C 60 220, 90 230, 130 200 S 200 150, 240 160 S 320 120, 360 90 S 440 60, 520 30"
        stroke="url(#hero-spark-stroke)"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}
