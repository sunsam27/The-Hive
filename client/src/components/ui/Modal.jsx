import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import Button from './Button';

const Modal = ({ isOpen, onClose, title, children, footer }) => {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <Button variant="ghost" size="sm" onClick={onClose} style={{ padding: '4px' }}>
            <X size={20} />
          </Button>
        </div>
        <div className="modal-content">
          {children}
        </div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>

      <style>{`
        .modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          animation: fadeIn 0.25s ease-out;
        }
        .modal-card {
          background: var(--color-surface);
          width: 100%;
          max-width: 600px;
          border-radius: 20px;
          box-shadow: 0 24px 80px rgba(0,0,0,0.15);
          display: flex;
          flex-direction: column;
          max-height: 85vh;
          overflow: hidden;
          animation: slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .modal-header {
          padding: 24px 28px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid var(--color-outline-variant);
        }
        .modal-title {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 20px;
          font-weight: 700;
          color: var(--color-on-surface);
          letter-spacing: -0.3px;
        }
        .modal-content {
          padding: 28px;
          overflow-y: auto;
        }
        .modal-footer {
          padding: 20px 28px;
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          border-top: 1px solid var(--color-outline-variant);
        }

        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { 
          from { transform: translateY(24px) scale(0.98); opacity: 0; } 
          to { transform: translateY(0) scale(1); opacity: 1; } 
        }
      `}</style>
    </div>
  );
};

export default Modal;
