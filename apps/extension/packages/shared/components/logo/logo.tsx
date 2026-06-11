import { twMerge } from 'tailwind-merge';
import { config } from './../../config';

interface ILogoProps {
  size?: 'base' | 'sm';
}

export const Logo: React.FC<ILogoProps> = ({ size = 'base' }) => {
  let className = 'logo';

  switch (size) {
    case 'base':
      className = twMerge(className, 'logo-base');
      break;
    case 'sm':
      className = twMerge(className, 'logo-sm');
      break;
  }

  return (
    <div className={className}>
      <span>{config.APP_NAME}</span>
    </div>
  );
};
