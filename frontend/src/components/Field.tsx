import type { InputHTMLAttributes } from 'react';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
  prefix?: string;
}

export function Field({ label, error, hint, prefix, id, ...props }: Props) {
  return (
    <div className="field">
      <label htmlFor={id}>
        {label}
        {prefix && (
          <span className="sr-only">
            {prefix === '£'
              ? ', in pounds'
              : prefix === '%'
                ? ', in percent'
                : ''}
          </span>
        )}
      </label>
      <div className={`input-wrap ${error ? 'invalid' : ''}`}>
        {prefix && <span aria-hidden="true">{prefix}</span>}
        <input
          id={id}
          aria-invalid={Boolean(error)}
          aria-describedby={
            error ? `${id}-error` : hint ? `${id}-hint` : undefined
          }
          {...props}
        />
      </div>
      {error ? (
        <p id={`${id}-error`} className="field-error">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="hint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
