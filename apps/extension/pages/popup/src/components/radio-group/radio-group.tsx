import type { RadioGroupItemProps, RadioGroupProps } from '@radix-ui/react-radio-group';
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';
import './radio-group.css';

const RadioGroup = () => <></>;

const RadioGroupRoot = (props: RadioGroupProps) => <RadioGroupPrimitive.Root className="radio-group-root" {...props} />;

interface IRadioGroupItemProps extends RadioGroupItemProps {
  label?: string;
}

const RadioGroupItem = ({ label, id, ...props }: IRadioGroupItemProps) => (
  <div className="flex flex-row items-center">
    <RadioGroupPrimitive.Item className="radio-group-item" {...props} id={id}>
      <RadioGroupPrimitive.Indicator className="radio-group-indicator" />
    </RadioGroupPrimitive.Item>
    {label && (
      <label className="radio-group-label" htmlFor={id}>
        {label}
      </label>
    )}
  </div>
);

RadioGroup.Root = RadioGroupRoot;
RadioGroup.Item = RadioGroupItem;

export { RadioGroup };
