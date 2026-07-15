"use client";
import { useEffect, useRef, useState } from "react";
import axios from "axios";

type Message = { role: "user" | "assistant"; content: string };

type Props = {
  analysisData: any;
  suggestedQuestions?: string[];
  embedded?: boolean;
  analysisId?: string;
  apiEndpoint?: string;
  buildPayload?: (analysisData: any, msg: string, history: Message[]) => object;
};

export default function ChatBox({ analysisData, suggestedQuestions = [], embedded = false, analysisId, apiEndpoint = "http://localhost:8000/chat", buildPayload }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  /* Load saved chat history for this analysis */
  useEffect(() => {
    if (!analysisId) return;
    try {
      const saved = localStorage.getItem(`fb_chat_${analysisId}`);
      if (saved) setMessages(JSON.parse(saved));
    } catch {}
  }, [analysisId]);

  /* Save chat history whenever messages change */
  useEffect(() => {
    if (!analysisId || messages.length === 0) return;
    try {
      localStorage.setItem(`fb_chat_${analysisId}`, JSON.stringify(messages));
    } catch {}
  }, [messages, analysisId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setMessages((prev) => [...prev, { role: "user", content: msg }]);
    setInput("");
    setLoading(true);
    try {
      const payload = buildPayload
        ? buildPayload(analysisData, msg, messages)
        : {
            product_name: analysisData.product_name ?? "",
            feedback: analysisData._feedback ?? "",
            analysis: analysisData,
            message: msg,
            history: messages,
          };
      const res = await axios.post(apiEndpoint, payload);
      setMessages((prev) => [...prev, { role: "assistant", content: res.data.reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Something went wrong. Check if backend is running." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const clearHistory = () => {
    if (!analysisId) return;
    setMessages([]);
    try { localStorage.removeItem(`fb_chat_${analysisId}`); } catch {}
  };

  const inner = (
    <>
      {/* Suggested questions */}
      {suggestedQuestions.length > 0 && messages.length === 0 && (
        <div className="px-3 pt-3 flex flex-wrap gap-1.5 shrink-0">
          {suggestedQuestions.map((q, i) => (
            <button
              key={i}
              onClick={() => send(q)}
              className="text-xs px-2.5 py-1 rounded-full border border-gray-300 dark:border-gray-700 text-gray-500 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all leading-snug text-left"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="px-3 py-3 space-y-3 overflow-y-auto flex-1 min-h-0">
        {messages.length === 0 && !loading && (
          <p className="text-xs text-gray-400 dark:text-gray-600 text-center pt-4 leading-relaxed">
            Ask anything about this analysis —<br />verdict reasoning, risks, what would change the outcome...
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
              m.role === "user"
                ? "bg-emerald-500 text-white rounded-br-sm"
                : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-sm"
            }`}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-bl-sm px-3.5 py-2.5">
              <span className="flex gap-1 items-center">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-3 pb-3 flex gap-2 border-t border-gray-200 dark:border-gray-800 pt-2 shrink-0">
        <input
          className="flex-1 bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-200 text-sm rounded-xl border border-gray-200 dark:border-gray-700 px-3 py-2 focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-gray-400 min-w-0"
          placeholder="Ask anything about this analysis..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          disabled={loading}
        />
        <button
          onClick={() => send()}
          disabled={loading || !input.trim()}
          className="shrink-0 px-3 py-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          →
        </button>
      </div>
    </>
  );

  if (embedded) {
    return <div className="flex flex-col flex-1 min-h-0">{inner}</div>;
  }

  return (
    <div className="mt-5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden flex flex-col">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-sm font-bold text-gray-900 dark:text-white">Ask the Analyst</span>
          <span className="text-xs text-gray-400 dark:text-gray-600">· Groq</span>
        </div>
        {messages.length > 0 && (
          <button onClick={clearHistory} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            Clear
          </button>
        )}
      </div>
      {inner}
    </div>
  );
}
