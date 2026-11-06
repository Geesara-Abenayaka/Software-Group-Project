import { useCallback, useState } from 'react';
import ConfirmDialog from '../components/ConfirmDialog';

/**
 * `const { confirm, confirmDialog } = useConfirm();`
 * then `if (!(await confirm({ title, message, confirmLabel, danger: true }))) return;`
 * and render `{confirmDialog}` once in the page.
 */
function useConfirm() {
  const [request, setRequest] = useState(null);

  const confirm = useCallback((options) => new Promise((resolve) => {
    setRequest({ ...options, resolve });
  }), []);

  const close = (result) => {
    request?.resolve(result);
    setRequest(null);
  };

  const confirmDialog = request ? (
    <ConfirmDialog
      title={request.title}
      message={request.message}
      confirmLabel={request.confirmLabel}
      danger={request.danger}
      onConfirm={() => close(true)}
      onCancel={() => close(false)}
    />
  ) : null;

  return { confirm, confirmDialog };
}

export default useConfirm;
