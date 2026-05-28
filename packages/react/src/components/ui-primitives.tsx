import React from 'react';

/** Minimal unstyled primitives for embeds (e.g. payment widget). */
export function Button(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" {...props} />;
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} />;
}

export function Alert({
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) {
  return (
    <div role="alert" {...rest}>
      {children}
    </div>
  );
}
