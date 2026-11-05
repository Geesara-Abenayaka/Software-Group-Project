// Short messages in the corner instead of alert(). Any page can call toast.success('Saved');
// ToastHost (rendered once in App.jsx) listens for the event and shows them.
export const TOAST_EVENT = 'app-toast';

const show = (type, message) => {
  window.dispatchEvent(new CustomEvent(TOAST_EVENT, {
    detail: { type, message, id: `${Date.now()}-${Math.random()}` }
  }));
};

export const toast = {
  success: (message) => show('success', message),
  error: (message) => show('error', message),
  info: (message) => show('info', message)
};
