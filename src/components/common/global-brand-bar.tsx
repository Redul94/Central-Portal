import Image from "next/image";
import Link from "next/link";

export default function GlobalBrandBar() {
  return (
    <div className="border-t-[3px] border-gray-600 bg-[#111111] text-white">
      <div className="mx-auto flex max-w-[1500px] items-center px-6 py-3">

        <Link
          href="/"
          className="flex items-center gap-4 transition hover:opacity-90"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white p-1">
            <Image
              src="/atg-logo.png"
              alt="Auko-Tex Group"
              width={48}
              height={48}
              priority
              className="h-full w-full object-contain"
            />
          </div>

          <span className="text-2xl font-bold text-white">
            Auko-Tex Group
          </span>
        </Link>

      </div>
    </div>
  );
}