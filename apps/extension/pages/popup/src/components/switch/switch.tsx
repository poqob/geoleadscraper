import type { SwitchProps } from '@radix-ui/react-switch';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import './switch.css';

export const Switch: React.FC<SwitchProps> = props => (
  <SwitchPrimitive.Root className="switch-root" id="airplane-mode" {...props}>
    <SwitchPrimitive.Thumb className="switch-thumb" />
  </SwitchPrimitive.Root>
);
