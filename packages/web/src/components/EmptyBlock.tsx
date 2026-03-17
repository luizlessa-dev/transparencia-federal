export default function EmptyBlock({
  title = "Nenhum dado disponível",
  message = "Não há registros para exibir no momento.",
}: {
  title?: string;
  message?: string;
}) {
  return (
    <div className="section">
      <h2 className="page-title">{title}</h2>
      <p>{message}</p>
    </div>
  );
}
