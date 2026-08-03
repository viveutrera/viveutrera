import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function FormField({ label, error, id, ...props }: FormFieldProps) {
  const inputId = id ?? props.name;
  return (
    <label className="form-field" htmlFor={inputId}>
      <span>{label}</span>
      <input id={inputId} aria-invalid={Boolean(error)} aria-describedby={error ? `${inputId}-error` : undefined} {...props} />
      {error ? <small id={`${inputId}-error`}>{error}</small> : null}
    </label>
  );
}

interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
}

export function TextAreaField({ label, error, id, ...props }: TextAreaFieldProps) {
  const inputId = id ?? props.name;
  return (
    <label className="form-field" htmlFor={inputId}>
      <span>{label}</span>
      <textarea id={inputId} aria-invalid={Boolean(error)} aria-describedby={error ? `${inputId}-error` : undefined} {...props} />
      {error ? <small id={`${inputId}-error`}>{error}</small> : null}
    </label>
  );
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
}

export function SelectField({ label, error, id, children, ...props }: SelectFieldProps) {
  const inputId = id ?? props.name;
  return (
    <label className="form-field" htmlFor={inputId}>
      <span>{label}</span>
      <select id={inputId} aria-invalid={Boolean(error)} aria-describedby={error ? `${inputId}-error` : undefined} {...props}>
        {children}
      </select>
      {error ? <small id={`${inputId}-error`}>{error}</small> : null}
    </label>
  );
}
