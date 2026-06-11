import { Transform } from 'class-transformer';

const serializer = {
  number: ({ value }) => (!value ? 0 : Number(`${value}`)),
};

export const ToNumber = () => Transform(serializer.number);
