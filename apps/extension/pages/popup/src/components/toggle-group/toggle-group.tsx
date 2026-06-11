import './toggle-group.css';

import { FiCheck, FiX } from 'react-icons/fi';
import { twMerge } from 'tailwind-merge';

interface IToggleItem {
  value: string;
  label: string;
  checked: boolean;
}

interface IToggleGroupProps {
  items: IToggleItem[];
  filter?: (items: IToggleItem[]) => IToggleItem[];
  onChange?: (items: IToggleItem[]) => void;
}

export const ToggleGroup: React.FC<IToggleGroupProps> = ({ filter, items, onChange }) => {
  const handleChange = (item: IToggleItem) => {
    if (onChange) {
      const updatedItems = items.map(currentItem =>
        currentItem.value === item.value ? { ...currentItem, checked: item.checked } : currentItem,
      );
      onChange(updatedItems);
    }
  };

  return (
    <div className="flex flex-row gap-2 flex-wrap">
      {(filter ? filter(items) : items).map(({ label, value, checked }, key) => (
        <ToggleItem
          key={key}
          id={value}
          checked={checked}
          onClick={checked =>
            handleChange({
              value,
              label,
              checked,
            })
          }>
          {label}
        </ToggleItem>
      ))}
    </div>
  );
};

interface IToggleItemProps {
  children: React.ReactNode;
  id: string;
  checked: boolean;
  onClick: (checked: boolean) => void;
}

const ToggleItem: React.FC<IToggleItemProps> = ({ id, children, checked, onClick }) => {
  return (
    <button
      id={id}
      className={twMerge(
        'bg-neutral-100 px-2 w-auto h-[26px] rounded flex flex-row items-center justify-center gap-2 cursor-pointer',
        checked ? 'bg-black text-white' : 'bg-neutral-200 text-neutral-800',
      )}
      onClick={() => onClick(!checked)}>
      <div
        className={twMerge(
          'text-xs w-[14px] h-[14px] flex justify-center items-center rounded-full',
          checked ? 'bg-white text-black' : 'bg-gray-500 text-white',
        )}>
        {checked ? <FiCheck /> : <FiX />}
      </div>
      <span>{children}</span>
    </button>
  );
};
