import { useState } from "react";
import ConfirmDialog from "./confirmationDialogBox";
import { useTranslation } from 'react-i18next';

function ConfirmDeleteButton({ 
  title, 
  message, 
  onConfirm, 
  loading = false 
}) {
  const { t } = useTranslation('common');
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={loading}
        className="text-red-600 hover:text-red-900"
      >
        {loading ? t('status.deleting') : t('actions.delete')}
      </button>

      <ConfirmDialog
        isOpen={open}
        title={title ?? t('confirm.title')}
        message={message ?? t('confirm.irreversible')}
        onCancel={() => setOpen(false)}
        onConfirm={() => {
          onConfirm?.();
          setOpen(false);
        }}
      />
    </>
  );
}

export default ConfirmDeleteButton;
