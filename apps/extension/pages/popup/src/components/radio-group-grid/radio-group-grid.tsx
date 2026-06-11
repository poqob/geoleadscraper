import { twMerge } from 'tailwind-merge';

interface RadioGridProps {
  items: {
    value: string;
    label: string;
  }[];
  value?: string;
  classNames?: {
    active?: string;
  };
  onChange?: (value: string) => void;
}

export const RadioGroupGrid: React.FC<RadioGridProps> = ({ items, value, classNames, onChange }) => {
  const defaultValue = value || items?.[0]?.value;

  const selected = (v: string) => v === value || v === defaultValue;

  const handleClick = (value: string) => {
    if (onChange) {
      onChange(value);
    }
  };

  return (
    <div className="relative w-auto flex flex-row border border-solid border-neutral-300 rounded-md overflow-hidden">
      {items.map(({ value, label }, key) => (
        <button
          key={key}
          className={twMerge(
            'w-[42px] h-[32px] cursor-pointer flex items-center justify-center border-0 border-r last:border-r-0 border-solid border-neutral-300 text-xs font-medium',
            selected(value) ? classNames?.active || 'bg-black text-white' : 'bg-white',
          )}
          onClick={() => handleClick(value)}>
          {label}
        </button>
      ))}
    </div>
  );
};
