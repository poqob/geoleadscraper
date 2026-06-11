import { twMerge } from 'tailwind-merge';

type TextInputProps = {
  size?: 'xs' | 'sm' | 'base';
  className?: string;
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  error?: string | null;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

export const TextInput: React.FC<TextInputProps> = ({
  size = 'base',
  disabled = false,
  value,
  // className: customClassName,
  placeholder,
  error,
  onChange,
}) => {
  let className = 'input';

  switch (size) {
    case 'base':
      className = twMerge(className, 'input-base');
      break;
    case 'sm':
      className = twMerge(className, 'input-sm');
      break;
    case 'xs':
      className = twMerge(className, 'input-xs');
      break;
  }

  switch (disabled) {
    case true:
      className = twMerge(className, 'input-disabled');
      break;
    case false:
      break;
  }

  if (error) {
    className = twMerge(className, 'input-danger');
  }

  // if (customClassName) {
  //   className = twMerge(className, customClassName);
  // }

  return (
    <div className="w-full flex flex-col">
      <input
        type="text"
        className={className}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={onChange}
      />
      {error && <span className="input-error-hint">{error}</span>}
    </div>
  );
};
