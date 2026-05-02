export const ADMIN_DARK_MODE_KEY = 'adminDarkModeEnabled';
export const ADMIN_THEME_CHANGE_EVENT = 'admin-theme-changed';

export const isAdminDarkModeEnabled = () => {
  return localStorage.getItem(ADMIN_DARK_MODE_KEY) === 'true';
};

export const setAdminDarkModeEnabled = (enabled) => {
  localStorage.setItem(ADMIN_DARK_MODE_KEY, String(enabled));
  window.dispatchEvent(
    new CustomEvent(ADMIN_THEME_CHANGE_EVENT, {
      detail: { enabled }
    })
  );
};

export const subscribeToAdminThemeChange = (handler) => {
  const eventHandler = (event) => {
    if (typeof handler === 'function') {
      handler(Boolean(event?.detail?.enabled));
    }
  };

  const storageHandler = (event) => {
    if (event.key === ADMIN_DARK_MODE_KEY && typeof handler === 'function') {
      handler(event.newValue === 'true');
    }
  };

  window.addEventListener(ADMIN_THEME_CHANGE_EVENT, eventHandler);
  window.addEventListener('storage', storageHandler);

  return () => {
    window.removeEventListener(ADMIN_THEME_CHANGE_EVENT, eventHandler);
    window.removeEventListener('storage', storageHandler);
  };
};
