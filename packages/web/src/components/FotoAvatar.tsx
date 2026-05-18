import Image from "next/image";

export function FotoAvatar({
  src,
  nome,
  size = 48,
}: {
  src: string | null;
  nome: string;
  size?: number;
}) {
  if (!src) {
    return (
      <div
        className="rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold flex-shrink-0"
        style={{ width: size, height: size, fontSize: size * 0.4 }}
        aria-hidden
      >
        {nome.charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={nome}
      width={size}
      height={size}
      className="rounded-full object-cover flex-shrink-0"
      unoptimized
    />
  );
}
