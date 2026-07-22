"use client";

import React, { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from "react";

interface ToastMessage { id: string; message: string; tone: "info" | "success" | "error" }
const ToastContext = createContext<{ messages: ToastMessage[]; notify: (message: string, tone?: ToastMessage["tone"]) => void }>({ messages: [], notify: () => undefined });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ToastMessage[]>([]);
  const notify = useCallback((message: string, tone: ToastMessage["tone"] = "info") => {
    const item = { id: crypto.randomUUID(), message, tone };
    setMessages((current) => [...current, item]);
    window.setTimeout(() => setMessages((current) => current.filter(({ id }) => id !== item.id)), 4000);
  }, []);
  return <ToastContext.Provider value={useMemo(() => ({ messages, notify }), [messages, notify])}>{children}</ToastContext.Provider>;
}

export function useToast() { return useContext(ToastContext); }
export function ToastViewport() {
  const { messages } = useContext(ToastContext);
  return <div aria-atomic="false" aria-live="polite" className="toast-viewport">{messages.map((toast) => <div className={`toast toast-${toast.tone}`} key={toast.id}>{toast.message}</div>)}</div>;
}
