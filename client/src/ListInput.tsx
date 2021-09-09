import type { Key, ReactNode } from 'react';
import { useEffect, useState } from 'react';

interface ListInputProps<T, VT extends Key> {
  items: T[];
  itemValue: (item: T) => VT;
  itemRender: (item: T) => ReactNode;
  name: string;
  placeholder: string;
  type: string;
  valueType: string;
}

let nextKey = 0;

export default function ListInput<T, VT extends Key>(props: ListInputProps<T, VT>) {
  const [inputKeys, setInputKeys] = useState<number[]>([]);
  const [items, setItems] = useState(props.items);

  useEffect(() => {
    setInputKeys([]);
    setItems(props.items);
  }, [props.items]);

  const addInput = () => setInputKeys((prev) => prev.concat(nextKey++));
  const removeInput = (key: number) => setInputKeys((prev) => prev.filter((i) => i !== key));
  const removeItem = (item: T) => setItems((prev) => prev.filter((i) => i !== item));

  return (
    <>
      {items.map((item) => (
        <div key={props.itemValue(item)} className='list-input-row'>
          {props.itemRender(item)}
          <input
            type='hidden'
            name={props.name}
            value={props.itemValue(item)}
            data-value-type={props.valueType}
            data-array
          />{' '}
          <button type='button' className='fake-a error' onClick={() => removeItem(item)}>
            [-]
          </button>
        </div>
      ))}
      {inputKeys.map((inputKey) => (
        <div key={inputKey} className='list-input-row'>
          <input
            type={props.type}
            name={props.name}
            placeholder={props.placeholder}
            data-value-type={props.valueType}
            data-array
          />{' '}
          <button type='button' className='fake-a error' onClick={() => removeInput(inputKey)}>
            [-]
          </button>
        </div>
      ))}
      <button type='button' className='fake-a success' onClick={addInput}>
        [+]
      </button>
    </>
  );
}
