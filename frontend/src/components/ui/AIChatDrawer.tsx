import React from 'react';

/**
 * AIChatDrawer — STUB
 * Will render a Gemini-powered dual-mode chat panel (RAG + generative Q&A).
 * Uses framer-motion for slide-in animation.
 */
export default function AIChatDrawer() {
  return (
    <div
      id="ai-chat-drawer-stub"
      className="flex flex-col"
      style={{ height: '55%', background: 'var(--color-bg-secondary)' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b shrink-0"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-base">🤖</span>
          <span className="text-sm font-semibold text-slate-200">Gemini AI Assistant</span>
        </div>
        <span
          className="text-xs px-2 py-0.5 rounded-full font-medium"
          style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6' }}
        >
          AI Chat · STUB
        </span>
      </div>

      {/* Message area */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
        {/* Fake AI message */}
        <div
          className="rounded-xl px-3 py-2 text-xs leading-relaxed max-w-[90%]"
          style={{ background: 'var(--color-bg-card)', color: 'var(--color-text-primary)' }}
        >
          <span className="font-medium text-blue-400 block mb-1">Gemini</span>
          Anomaly detected at WP09: thermal reading 14°C above baseline. Asset criticality: HIGH. Recommended action: schedule inspection within 24h.
        </div>

        {/* Fake user message */}
        <div
          className="rounded-xl px-3 py-2 text-xs leading-relaxed max-w-[85%] self-end"
          style={{ background: 'rgba(59,130,246,0.2)', color: '#bfdbfe' }}
        >
          What caused the confidence score drop?
        </div>
      </div>

      {/* Input bar */}
      <div
        className="px-3 py-2 border-t shrink-0 flex gap-2"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <input
          id="ai-chat-input"
          type="text"
          placeholder="Ask about mission data…"
          disabled
          className="flex-1 text-xs rounded-lg px-3 py-2 outline-none"
          style={{
            background: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-muted)',
          }}
        />
        <button
          id="ai-chat-send"
          disabled
          className="px-3 py-2 rounded-lg text-xs font-medium bg-blue-600/50 text-blue-300 cursor-not-allowed"
        >
          Send
        </button>
      </div>
    </div>
  );
}
