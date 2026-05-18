export function ValorBRL({ valor, className }: { valor: number; className?: string }) {
  const formatado = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(valor);

  return <span className={className}>{formatado}</span>;
}
