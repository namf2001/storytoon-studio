"use client";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { NleStudio } from "@/components/studio/NleStudio";
import { useProductVariant } from "@/components/studio/product-variant";

function ProductStudio() {
  return <NleStudio variant={useProductVariant()} />;
}

export default function ProductStudioPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-full items-center justify-center bg-background text-sm text-zinc-400">
          <Loader2 className="mr-2 h-4 w-4 animate-spin text-amber-400" />
          Đang khởi động Video sản phẩm…
        </div>
      }
    >
      <ProductStudio />
    </Suspense>
  );
}
