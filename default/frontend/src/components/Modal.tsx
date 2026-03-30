/**
 * Responsibility: Provides a reusable modal shell for admin create, edit, upload, and delete confirmation flows.
 */
import type { PropsWithChildren, ReactNode } from "react";

interface ModalProps extends PropsWithChildren {
  title: string;
  description?: string;
  onClose: () => void;
  footer?: ReactNode;
}

export const Modal = ({ title, description, onClose, footer, children }: ModalProps) => {
  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <section
        aria-modal="true"
        className="modal-panel"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header className="modal-header">
          <div>
            <h2>{title}</h2>
            {description ? <p className="modal-description">{description}</p> : null}
          </div>
          <button className="modal-close" onClick={onClose} type="button">
            Close
          </button>
        </header>

        <div className="modal-body">{children}</div>

        {footer ? <footer className="modal-footer">{footer}</footer> : null}
      </section>
    </div>
  );
};

