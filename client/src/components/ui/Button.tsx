

const Button = ({ variant = 'primary', size = 'md', children, className = '', ...props }) => {
  const getStyles = () => {
    let base = 'btn';
    let variantClass = `btn-${variant}`;
    let sizeClass = `btn-${size}`;
    return `${base} ${variantClass} ${sizeClass} ${className}`;
  };

  return (
    <button className={getStyles()} {...props}>
      {children}
      <style>{`
        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 600;
          transition: all 0.15s ease;
          cursor: pointer;
          border: none;
          gap: 8px;
          letter-spacing: -0.2px;
        }
        .btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .btn-sm { padding: 6px 14px; font-size: 13px; border-radius: 8px; }
        .btn-md { padding: 10px 22px; font-size: 14px; }
        .btn-lg { padding: 14px 30px; font-size: 16px; }

        .btn-primary {
          background: var(--color-primary);
          color: var(--color-on-primary);
        }
        .btn-primary:hover:not(:disabled) {
          opacity: 0.85;
        }

        .btn-secondary {
          background: var(--color-surface-container);
          color: var(--color-on-surface-variant);
        }
        .btn-secondary:hover:not(:disabled) {
          background: var(--color-outline-variant);
          color: var(--color-on-surface);
        }

        .btn-ghost {
          background: transparent;
          color: var(--color-on-surface-variant);
        }
        .btn-ghost:hover:not(:disabled) {
          background: var(--color-surface-container);
          color: var(--color-on-surface);
        }

        .btn-danger {
          background: var(--color-error-container);
          color: var(--color-on-error-container);
        }
        .btn-danger:hover:not(:disabled) {
          background: var(--color-error);
          color: var(--color-on-error);
        }
      `}</style>
    </button>
  );
};

export default Button;
