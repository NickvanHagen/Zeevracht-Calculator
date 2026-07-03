import type { InputHTMLAttributes } from 'react';

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label: string;
};

export function Checkbox({ label, id, ...props }: CheckboxProps) {
  const fieldId = id ?? props.name ?? label.toLowerCase().replaceAll(' ', '-');

  return (
    <label className="checkbox" htmlFor={fieldId}>
      <input id={fieldId} type="checkbox" {...props} />
      <span>{label}</span>
    </label>
  );
}
