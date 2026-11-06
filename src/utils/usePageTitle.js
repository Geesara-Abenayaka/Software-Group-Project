import { useEffect } from 'react';

const SITE = 'UoM CSE Postgraduate';

// Sets the browser tab title, e.g. usePageTitle('Admin login') -> "Admin login · UoM CSE Postgraduate".
// Without a title (the home page) it is the portal's name.
function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · ${SITE}` : `${SITE} Portal`;
  }, [title]);
}

export default usePageTitle;
