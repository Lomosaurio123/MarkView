"use client";

import { useEffect, useState } from "react";

interface Toast {
  id: string;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  variant?: "default" | "destructive";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const TOAST_LIMIT = 5;
const TOAST_REMOVE_DELAY = 5000;

type ToastAction = "ADD_TOAST" | "UPDATE_TOAST" | "DISMISS_TOAST" | "REMOVE_TOAST";

interface State {
  toasts: Toast[];
}

let count = 0;
function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER;
  return count.toString();
}

const toasts: State = { toasts: [] };
let listeners: Array<(state: State) => void> = [];

function dispatch(action: { type: ToastAction; toast?: Toast; toastId?: string }) {
  switch (action.type) {
    case "ADD_TOAST":
      toasts.toasts = [action.toast!, ...toasts.toasts].slice(0, TOAST_LIMIT);
      break;
    case "UPDATE_TOAST":
      toasts.toasts = toasts.toasts.map((t) =>
        t.id === action.toast?.id ? { ...t, ...action.toast } : t
      );
      break;
    case "DISMISS_TOAST": {
      const { toastId } = action;
      if (toastId) {
        toasts.toasts = toasts.toasts.map((t) =>
          t.id === toastId ? { ...t, open: false } : t
        );
      } else {
        toasts.toasts = toasts.toasts.map((t) => ({ ...t, open: false }));
      }
      break;
    }
    case "REMOVE_TOAST":
      if (action.toastId) {
        toasts.toasts = toasts.toasts.filter((t) => t.id !== action.toastId);
      } else {
        toasts.toasts = [];
      }
      break;
  }
  listeners.forEach((listener) => listener(toasts));
}

function toast(props: Omit<Toast, "id">) {
  const id = genId();
  const update = (props: Toast) => dispatch({ type: "UPDATE_TOAST", toast: { ...props, id } });
  const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id });

  dispatch({
    type: "ADD_TOAST",
    toast: { ...props, id, open: true, onOpenChange: (open: boolean) => !open && dismiss() },
  });

  setTimeout(() => dispatch({ type: "REMOVE_TOAST", toastId: id }), TOAST_REMOVE_DELAY);

  return { id, dismiss, update };
}

function useToast() {
  const [state, setState] = useState<State>(toasts);

  useEffect(() => {
    listeners.push(setState);
    return () => {
      listeners = listeners.filter((l) => l !== setState);
    };
  }, []);

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }),
  };
}

export { useToast, toast };