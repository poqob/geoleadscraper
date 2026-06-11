import { twMerge } from 'tailwind-merge';

export const Stack: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, ...props }) => {
  let className = 'w-full flex flex-col gap-2';

  if (props.className) {
    className = twMerge(className, props.className);
  }

  return <div className={className}>{children}</div>;
};
