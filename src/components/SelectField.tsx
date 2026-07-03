import type { SelectHTMLAttributes } from 'react';

export type SelectOption = {
  label: string;
  value: string;
};

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  options: SelectOption[];
};

export function SelectField({ label, id, options, ...props }: SelectFieldProps) {
  const fieldId = id ?? props.name ?? label.toLowerCase().replaceAll(' ', '-');

  return (
    <label className="field" htmlFor={fieldId}>
      <span>{label}</span>
      <select id={fieldId} {...props}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
