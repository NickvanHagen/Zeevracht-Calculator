import type { InputHTMLAttributes } from 'react';

type InputFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

export function InputField({ label, id, ...props }: InputFieldProps) {
  const fieldId = id ?? props.name ?? label.toLowerCase().replaceAll(' ', '-');

  return (
    <label className="field" htmlFor={fieldId}>
      <span>{label}</span>
      <input id={fieldId} {...props} />
    </label>
  );
}
