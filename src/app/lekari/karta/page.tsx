"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Zdravotná karta má vlastnú položku v menu; stará adresa na ňu presmeruje. */
export default function Page() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/karta");
  }, [router]);
  return <div className="screen" />;
}
