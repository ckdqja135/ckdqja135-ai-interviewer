"use client";

import { useEffect, useState } from "react";

interface Prompt {
  id: string;
  name: string;
  content: string;
}

export default function PromptsPage() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:4000/api/prompts")
      .then((res) => res.json())
      .then((data: Prompt[]) => {
        setPrompts(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSelect = (prompt: Prompt) => {
    setSelectedId(prompt.id);
    setEditContent(prompt.content);
    setSaveMessage(null);
  };

  const handleSave = async () => {
    if (!selectedId) return;
    setSaving(true);
    setSaveMessage(null);

    try {
      const res = await fetch(
        `http://localhost:4000/api/prompts/${selectedId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: editContent }),
        }
      );

      if (!res.ok) throw new Error("Failed to save");

      setPrompts((prev) =>
        prev.map((p) =>
          p.id === selectedId ? { ...p, content: editContent } : p
        )
      );
      setSaveMessage("저장되었습니다.");
    } catch {
      setSaveMessage("저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <p className="text-slate-400 text-center">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-6">프롬프트 관리</h1>

      <div className="grid md:grid-cols-[280px_1fr] gap-6">
        {/* Prompt list */}
        <div className="space-y-2">
          {prompts.map((prompt) => (
            <button
              key={prompt.id}
              onClick={() => handleSelect(prompt)}
              className={`w-full text-left rounded-lg px-4 py-3 text-sm transition-colors ${
                selectedId === prompt.id
                  ? "bg-blue-600 text-white"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {prompt.name}
            </button>
          ))}
        </div>

        {/* Editor */}
        <div>
          {selectedId ? (
            <div className="space-y-4">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full h-96 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 p-4 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex items-center gap-4">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-6 py-2.5 text-sm font-medium transition-colors"
                >
                  {saving ? "저장 중..." : "저장"}
                </button>
                {saveMessage && (
                  <span
                    className={`text-sm ${
                      saveMessage.includes("실패")
                        ? "text-red-400"
                        : "text-green-400"
                    }`}
                  >
                    {saveMessage}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 rounded-xl bg-slate-800 border border-slate-700">
              <p className="text-slate-500 text-sm">
                프롬프트를 선택하세요
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
