import { useState } from "react";
import ConfirmDialog from "./confirmationDialogBox";

function ConfirmDeleteButton({ 
  title = "Are you sure?", 
  message = "This action cannot be undone.", 
  onConfirm, 
  loading = false 
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={loading}
        className="text-red-600 hover:text-red-900"
      >
        {loading ? "Deleting..." : "Delete"}
      </button>

      <ConfirmDialog
        isOpen={open}
        title={title}
        message={message}
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
