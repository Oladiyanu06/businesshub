export function BrandMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <span
      className={`grid place-items-center rounded-xl bg-slate-900 text-white shadow-sm ${className}`}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M4 19V8.5L12 4l8 4.5V19"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M9 19v-5h6v5" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        <path d="M4 19h16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    </span>
  );
}
