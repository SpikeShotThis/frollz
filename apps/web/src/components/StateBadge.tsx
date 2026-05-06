export function StateBadge({ code, label }: { code: string; label: string }) {
  return (
    <span className={`badge badge-${code}`}>
      {label}
    </span>
  );
}
