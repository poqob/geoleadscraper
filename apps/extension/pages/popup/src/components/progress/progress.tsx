// import type { ProgressProps } from '@radix-ui/react-progress';

import * as ProgressPrimitive from '@radix-ui/react-progress';
import './progress.css';

interface IProgressProps {
  value?: number;
  total?: number;
}

export const Progress: React.FC<IProgressProps> = ({ value = 0, total = 100 }) => {
  const progress = Math.round((value / total) * 100);
  const translateX = progress < 100 ? 100 - progress : 0;

  return (
    <ProgressPrimitive.Root className="progress-root" value={value}>
      <ProgressPrimitive.Indicator
        className="progress-indicator"
        style={{ transform: `translateX(-${translateX}%)` }}
      />
    </ProgressPrimitive.Root>
  );
};
