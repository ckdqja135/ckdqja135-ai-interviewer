"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";

interface Message {
  role: "assistant" | "user";
  content: string;
}

interface Prompt {
  id: string;
  name: string;
}

export default function InterviewPage() {
  const params = useParams<{ type: string }>();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [promptName, setPromptName] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [resumeFileName, setResumeFileName] = useState<string | null>(null);
  const [interviewEnded, setInterviewEnded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch prompt name on mount
  useEffect(() => {
    fetch("http://localhost:4000/api/prompts")
      .then((res) => res.json())
      .then((prompts: Prompt[]) => {
        const found = prompts.find((p) => p.id === params.type);
        if (found) setPromptName(found.name);
      })
      .catch(() => {});
  }, [params.type]);

  const sendToApi = useCallback(
    async (conversationMessages: Message[], sid: string | null) => {
      setIsLoading(true);

      try {
        const res = await fetch("http://localhost:4000/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            promptId: params.type,
            messages: conversationMessages,
            sessionId: sid,
          }),
        });

        if (!res.ok) throw new Error("Failed to send message");
        if (!res.body) throw new Error("No response body");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data: ")) continue;
            const jsonStr = trimmed.slice(6);
            if (jsonStr === "[DONE]") continue;

            try {
              const parsed = JSON.parse(jsonStr);
              if (parsed.content) {
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last && last.role === "assistant") {
                    updated[updated.length - 1] = {
                      ...last,
                      content: last.content + parsed.content,
                    };
                  }
                  return updated;
                });
              }
            } catch {
              // skip malformed JSON
            }
          }
        }
      } catch (err) {
        console.error("Chat error:", err);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "오류가 발생했습니다. 다시 시도해주세요." },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [params.type]
  );

  const handleUploadResume = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("resume", file);

    try {
      const res = await fetch("http://localhost:4000/api/upload-resume", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      const data = await res.json();
      setSessionId(data.sessionId);
      setResumeFileName(file.name);
    } catch (err) {
      console.error("Upload error:", err);
      alert("PDF 업로드에 실패했습니다.");
    } finally {
      setUploading(false);
    }
  };

  const handleStartInterview = () => {
    setStarted(true);
    sendToApi([{ role: "user", content: "면접을 시작해주세요." }], sessionId);
  };

  const handleSend = (text: string) => {
    if (interviewEnded) return;
    const userMessage: Message = { role: "user", content: text };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    sendToApi(newMessages, sessionId);
  };

  const handleEndInterview = () => {
    if (isLoading || interviewEnded) return;
    setInterviewEnded(true);
    const feedbackRequest: Message = {
      role: "user",
      content:
        "면접을 종료합니다. 지금까지의 모든 질문과 답변을 바탕으로 종합 피드백을 제공해주세요. 강점, 약점, 개선할 점, 총평을 상세하게 정리해주세요.",
    };
    const newMessages = [...messages, feedbackRequest];
    setMessages(newMessages);
    sendToApi(newMessages, sessionId);
  };

  // Pre-interview setup screen
  if (!started) {
    return (
      <div className="flex flex-col h-[calc(100vh-3.5rem)]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 bg-slate-800">
          <h1 className="font-semibold text-white">
            {promptName || "면접 준비"}
          </h1>
          <button
            onClick={() => router.push("/")}
            className="text-sm text-slate-400 hover:text-white border border-slate-600 hover:border-slate-400 rounded-lg px-3 py-1.5 transition-colors"
          >
            돌아가기
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <div className="max-w-md w-full mx-4 space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-bold text-white mb-2">
                면접 준비
              </h2>
              <p className="text-slate-400 text-sm">
                이력서(PDF)를 업로드하면 맞춤형 질문을 받을 수 있습니다.
              </p>
            </div>

            {/* PDF Upload Area */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                resumeFileName
                  ? "border-blue-500 bg-blue-500/10"
                  : "border-slate-600 hover:border-slate-400"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleUploadResume}
                className="hidden"
              />
              {uploading ? (
                <p className="text-slate-400">업로드 중...</p>
              ) : resumeFileName ? (
                <div>
                  <p className="text-blue-400 font-medium">{resumeFileName}</p>
                  <p className="text-slate-500 text-sm mt-1">
                    업로드 완료 (다시 클릭하여 변경)
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-slate-300">PDF 파일을 선택하세요</p>
                  <p className="text-slate-500 text-sm mt-1">
                    선택사항 - 없어도 면접 진행 가능
                  </p>
                </div>
              )}
            </div>

            {/* Start Button */}
            <button
              onClick={handleStartInterview}
              disabled={uploading}
              className="w-full rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-3 font-medium transition-colors"
            >
              {resumeFileName ? "이력서 기반 면접 시작" : "면접 시작"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 bg-slate-800">
        <div className="flex items-center gap-3">
          <h1 className="font-semibold text-white">
            {promptName || "면접 진행 중..."}
          </h1>
          {resumeFileName && (
            <span className="text-xs bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded">
              이력서 적용됨
            </span>
          )}
        </div>
        {interviewEnded ? (
          <button
            onClick={() => router.push("/")}
            className="text-sm text-white bg-blue-600 hover:bg-blue-500 rounded-lg px-3 py-1.5 transition-colors"
          >
            메인으로 돌아가기
          </button>
        ) : (
          <button
            onClick={handleEndInterview}
            disabled={isLoading}
            className="text-sm text-slate-400 hover:text-white border border-slate-600 hover:border-slate-400 disabled:opacity-50 rounded-lg px-3 py-1.5 transition-colors"
          >
            면접 종료
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map((msg, i) => (
          <ChatMessage key={i} role={msg.role} content={msg.content} />
        ))}
        {isLoading && messages[messages.length - 1]?.content === "" && (
          <div className="flex items-center gap-2 text-slate-400 text-sm py-2 px-4">
            <span className="animate-pulse">입력중...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {interviewEnded ? (
        <div className="px-4 py-4 border-t border-slate-700 bg-slate-800 text-center">
          <p className="text-slate-400 text-sm">면접이 종료되었습니다. 위의 피드백을 확인해주세요.</p>
        </div>
      ) : (
        <ChatInput onSend={handleSend} disabled={isLoading} />
      )}
    </div>
  );
}
