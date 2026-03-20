"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Prompt {
  id: string;
  name: string;
  content?: string;
}

export default function HomePage() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetch("http://localhost:4000/api/prompts")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch prompts");
        return res.json();
      })
      .then((data) => {
        setPrompts(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-white mb-3">AI 면접관</h1>
        <p className="text-slate-400 text-lg">면접 유형을 선택하세요</p>
      </div>

      {loading && (
        <p className="text-center text-slate-400">로딩 중...</p>
      )}

      {error && (
        <p className="text-center text-red-400">
          오류: {error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {prompts.map((prompt) => (
          <div
            key={prompt.id}
            className="bg-slate-800 border border-slate-700 rounded-xl p-6 hover:border-slate-500 transition-colors"
          >
            <h2 className="text-lg font-semibold text-white mb-4">
              {prompt.name}
            </h2>
            <button
              onClick={() => router.push(`/interview/${prompt.id}`)}
              className="w-full rounded-lg bg-blue-600 hover:bg-blue-500 text-white py-2.5 text-sm font-medium transition-colors"
            >
              면접 시작
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
