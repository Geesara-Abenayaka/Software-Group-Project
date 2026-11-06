import { useEffect, useRef } from 'react';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Keyboard handling for a modal while `active`: focus moves into it (first control, or the dialog itself),
 * Tab and Shift+Tab stay inside, Esc calls onClose (pass null for a dialog that can't be closed, like the
 * submission progress), and focus goes back to the control that opened it.
 */
function useDialogFocus(dialogRef, onClose, active) {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!active || !dialog) return undefined;

    const opener = document.activeElement;
    const focusables = () => [...dialog.querySelectorAll(FOCUSABLE)].filter((element) => element.offsetParent !== null);
    (focusables()[0] || dialog).focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && onCloseRef.current) {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;

      const items = focusables();
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (opener?.isConnected) opener.focus();
    };
  }, [active, dialogRef]);
}

export default useDialogFocus;
