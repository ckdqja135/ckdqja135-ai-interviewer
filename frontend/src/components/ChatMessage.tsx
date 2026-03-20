"use client";

import ReactMarkdown from "react-markdown";

interface ChatMessageProps {
  role: "assistant" | "user";
  content: string;
}

export default function ChatMessage({ role, content }: ChatMessageProps) {
  const isAssistant = role === "assistant";

  return (
    <div
      className={`flex ${isAssistant ? "justify-start" : "justify-end"} mb-4`}
    >
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-3 ${
          isAssistant
            ? "bg-slate-700 text-slate-200 rounded-tl-sm"
            : "bg-blue-600 text-white rounded-tr-sm"
        }`}
      >
        {isAssistant ? (
          <div className="text-sm leading-relaxed prose prose-invert prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-headings:my-2">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        ) : (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
        )}
      </div>
    </div>
  );
}
