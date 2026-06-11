import { twMerge } from 'tailwind-merge';

interface CardProps {
  children: React.ReactElement;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className }) => (
  <div className={twMerge('w-full h-auto flex border border-neutral-300 p-4 rounded-md', className)}>{children}</div>
);
