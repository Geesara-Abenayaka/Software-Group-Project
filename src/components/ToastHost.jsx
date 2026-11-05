import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { TOAST_EVENT } from '../utils/toast';
import '../styles/toast.css';

const AUTO_CLOSE_MS = 4000;
const MAX_TOASTS = 4;
const ICONS = { success: CheckCircle2, error: AlertCircle, info: Info };

// One toast. Success and info close after 4 s; errors stay until dismissed because the user has to act on them.
// Hovering or focusing a toast pauses its timer.
function Toast({ toast, onDismiss }) {
  const [paused, setPaused] = useState(false);
  const remainingRef = useRef(AUTO_CLOSE_MS);
  const Icon = ICONS[toast.type] || Info;

  useEffect(() => {
    if (toast.type === 'error' || paused) return undefined;
    const startedAt = Date.now();
    const timer = setTimeout(() => onDismiss(toast.id), remainingRef.current);
    return () => {
      clearTimeout(timer);
      remainingRef.current -= Date.now() - startedAt;
    };
  }, [paused, toast, onDismiss]);

  return (
    <div
      className={`toast toast--${toast.type}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <Icon size={20} className="toast__icon" aria-hidden="true" />
      <p className="toast__message">
        {toast.type === 'error' && <span className="sr-only">Error: </span>}
        {toast.message}
      </p>
      <button type="button" className="toast__close" onClick={() => onDismiss(toast.id)} aria-label="Dismiss">
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  );
}

// Bottom-left (the chatbot is bottom-right). A polite live region, and toasts never take focus.
function ToastHost() {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((item) => item.id !== id));
  }, []);

  useEffect(() => {
    const handleToast = (event) => {
      setToasts((list) => [...list, event.detail].slice(-MAX_TOASTS));
    };
    window.addEventListener(TOAST_EVENT, handleToast);
    return () => window.removeEventListener(TOAST_EVENT, handleToast);
  }, []);

  return (
    <div className="toast-host" role="status" aria-live="polite">
      {toasts.map((item) => (
        <Toast key={item.id} toast={item} onDismiss={dismiss} />
      ))}
    </div>
  );
}

export default ToastHost;
