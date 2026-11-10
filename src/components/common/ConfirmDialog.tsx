import { clsx } from 'clsx';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  variant?: 'danger' | 'default';
}

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  variant = 'default',
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Card */}
      <div
        className="relative z-10 w-full max-w-md rounded-xl border border-slate-700/50 p-6 shadow-2xl"
        style={{ backgroundColor: '#1a1f2e' }}
      >
        <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
        <p className="mt-2 text-sm text-slate-400">{description}</p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={clsx(
              'rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors',
              variant === 'danger'
                ? 'bg-red-600 hover:bg-red-500'
                : 'bg-cyan-600 hover:bg-cyan-500',
            )}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
