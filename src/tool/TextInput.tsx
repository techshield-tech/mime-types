import type { InputHTMLAttributes } from 'react';

export type TextInputProps = InputHTMLAttributes<HTMLInputElement>;

export function TextInput({ className = '', ...props }: TextInputProps) {
  return (
    <input
      type="text"
      spellCheck={false}
      autoCapitalize="off"
      autoComplete="off"
      autoCorrect="off"
      className={`h-9 w-full min-w-0 rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)] px-3 text-sm text-[var(--color-fg)] outline-none placeholder:text-[var(--color-subtle)] focus:border-[var(--color-accent)] ${className}`}
      {...props}
    />
  );
}
