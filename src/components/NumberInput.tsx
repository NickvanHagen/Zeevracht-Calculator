import { InputField } from './InputField';
import type { InputHTMLAttributes } from 'react';

type NumberInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label: string;
};

export function NumberInput({ label, ...props }: NumberInputProps) {
  return <InputField inputMode="decimal" label={label} min="0" step="0.01" type="number" {...props} />;
}
