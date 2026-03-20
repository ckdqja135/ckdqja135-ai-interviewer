"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="bg-slate-800 border-b border-slate-700">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-6">
        <Link
          href="/"
          className={`font-semibold text-lg ${
            pathname === "/" ? "text-white" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          AI 면접관
        </Link>
        <Link
          href="/prompts"
          className={`text-sm ${
            pathname === "/prompts"
              ? "text-white"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          프롬프트 관리
        </Link>
      </div>
    </nav>
  );
}
