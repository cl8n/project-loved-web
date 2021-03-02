import React from 'react';

export function BoolView({ value }: { value: boolean }) {
  return (
    <span className={value ? 'true' : 'false'}>
      {value ? 'Yes' : 'No'}
    </span>
  );
}
