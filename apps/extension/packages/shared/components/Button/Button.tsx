import { Spinner } from '../Spinner';
import { twMerge } from 'tailwind-merge';

type ButtonProps = {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'upgrade';
  size?: 'xs' | 'sm' | 'base';
  loading?: boolean;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
};

export const Button: React.FC<ButtonProps> = ({
  children,
  loading,
  size = 'base',
  variant = 'primary',
  disabled = false,
  onClick,
  className: customClassName,
}) => {
  let className = 'button';

  switch (variant) {
    case 'primary':
      className = twMerge(className, 'button-primary');
      break;
    case 'secondary':
      className = twMerge(className, 'button-secondary');
      break;
    case 'upgrade':
      className = twMerge(className, 'button-upgrade');
      break;
  }

  switch (size) {
    case 'base':
      className = twMerge(className, 'button-base');
      break;
    case 'sm':
      className = twMerge(className, 'button-sm');
      break;
    case 'xs':
      className = twMerge(className, 'button-xs');
      break;
  }

  switch (loading) {
    case true:
      className = twMerge(className, 'button-loading');
      break;
    case false:
      break;
  }

  switch (disabled) {
    case true:
      className = twMerge(className, 'button-disabled');
      break;
    case false:
      break;
  }

  if (customClassName) {
    className = twMerge(className, customClassName);
  }

  return (
    <button className={className} disabled={disabled || loading} onClick={onClick}>
      {loading ? <Spinner /> : children}
    </button>
  );
};
