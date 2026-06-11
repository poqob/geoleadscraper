export const arrayToCSV = ({
  fields = [],
  data,
}: {
  fields?: string[];
  data: Record<string, number | string | boolean | undefined>[];
}): string | null => {
  if (data.length <= 0) return null;

  fields = fields.length ? fields : Object.keys(data[0]);

  const headers = fields.join(',');
  const rows = data
    .map(obj =>
      fields
        .map(key => {
          const value = obj[key];
          switch (typeof value) {
            case 'number':
              return `${value}`;
            case 'string':
              return `"${value?.toString().replace(/"/g, '""')}"`;
            case 'boolean':
              return `"${value ? 'TRUE' : 'FALSE'}"`;
            default:
              return '';
          }
        })
        .join(','),
    )
    .join('\n');

  return `${headers}\n${rows}`;
};

export const renderNumber = (number: number): string => {
  if (!number) return '0';

  const value = number.toString();

  if (number >= 1000000) {
    return '0';
  }

  if (number >= 100000 && number < 1000000) {
    return [value.slice(0, 3), value.slice(-3)].join(',');
  }

  if (number >= 10000 && number < 1000000) {
    return [value.slice(0, 2), value.slice(-3)].join(',');
  }

  if (number >= 1000) {
    return [value.slice(0, 1), value.slice(-3)].join(',');
  }

  return value;
};
