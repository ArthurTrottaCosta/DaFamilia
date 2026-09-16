export function Brand({ light = false }: { light?: boolean }) {
  return (
    <a
      href="/"
      className={"brand" + (light ? " brand-light" : "")}
      aria-label="DaFamília — início"
    >
      <svg viewBox="0 0 40 40" aria-hidden="true">
        <path
          d="M8 21 20 10l12 11v12H8Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinejoin="round"
        />
        <path
          d="M14 22c0-4 6-4 6 0 0-4 6-4 6 0 0 4-6 7-6 7s-6-3-6-7"
          fill="currentColor"
        />
      </svg>
      <span>
        DaFamília<span className="brand-dot">.</span>
      </span>
    </a>
  );
}
