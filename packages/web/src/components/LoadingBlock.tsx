export default function LoadingBlock({ message = "Carregando…" }: { message?: string }) {
  return (
    <div className="section" role="status" aria-live="polite">
      <p className="lead">{message}</p>
    </div>
  );
}
