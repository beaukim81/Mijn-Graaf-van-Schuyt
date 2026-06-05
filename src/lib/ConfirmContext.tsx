/* eslint-disable react-refresh/only-export-components */
import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from "react";

interface ConfirmOptions {
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

interface PendingConfirm extends ConfirmOptions {
  resolve: (confirmed: boolean) => void;
}

const ConfirmContext = createContext<((options: ConfirmOptions) => Promise<boolean>) | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => new Promise<boolean>((resolve) => {
    setPendingConfirm({ ...options, resolve });
  }), []);

  const value = useMemo(() => confirm, [confirm]);

  function close(confirmed: boolean) {
    pendingConfirm?.resolve(confirmed);
    setPendingConfirm(null);
  }

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {pendingConfirm && (
        <div className="confirm-overlay" role="presentation">
          <section aria-modal="true" className="confirm-dialog" role="dialog">
            <h2>Weet je het zeker?</h2>
            <p>{pendingConfirm.message}</p>
            <div className="confirm-dialog__actions">
              <button className="button button--soft" onClick={() => close(false)} type="button">
                {pendingConfirm.cancelLabel ?? "Annuleren"}
              </button>
              <button className="button button--danger" onClick={() => close(true)} type="button">
                {pendingConfirm.confirmLabel ?? "Verwijderen"}
              </button>
            </div>
          </section>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error("useConfirm must be used inside ConfirmProvider");
  return confirm;
}
