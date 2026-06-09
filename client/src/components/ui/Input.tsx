import { forwardRef } from 'react';

const Input = forwardRef(({ label, error, helperText, className = '', ...props }, ref) => {
  return (
    <div className={`input-group ${className}`}>
      {label && <label className="input-label">{label}</label>}
      <input
        ref={ref}
        className={`input-field ${error ? 'input-field-error' : ''}`}
        {...props}
      />
      {error && <span className="input-error-text">{error.message || error}</span>}
      {helperText && !error && <span className="input-helper-text">{helperText}</span>}

      <style>{`
        .input-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 16px;
          width: 100%;
        }
        .input-label {
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 500;
          font-size: 13px;
          color: var(--color-on-surface-variant);
        }
        .input-field {
          padding: 10px 14px;
          border-radius: 10px;
          border: 1.5px solid var(--color-outline-variant);
          background: var(--color-surface);
          color: var(--color-on-surface);
          font-family: 'Space Grotesk', sans-serif;
          font-size: 14px;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .input-field:focus {
          outline: none;
          border-color: var(--color-primary);
          box-shadow: 0 0 0 3px rgba(0, 113, 227, 0.1);
        }
        .input-field-error {
          border-color: var(--color-error);
        }
        .input-error-text {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 12px;
          color: var(--color-error);
          margin-top: 2px;
        }
        .input-helper-text {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 12px;
          color: var(--color-on-surface-variant);
          margin-top: 2px;
        }
      `}</style>
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
