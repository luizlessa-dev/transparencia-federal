export default function ErrorBlock({
  title = "Erro ao carregar",
  message,
}: {
  title?: string;
  message: string;
}) {
  return (
    <div className="section" role="alert">
      <h2 className="page-title">{title}</h2>
      <p>{message}</p>
    </div>
  );
}
