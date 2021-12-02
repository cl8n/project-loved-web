import type { ReactNode } from 'react';
import { Fragment } from 'react';
import { useEffect, useState } from 'react';

function removeButtonRenderer(id: number) {
  const removeItem = () => {
    document.dispatchEvent(new CustomEvent('removeListInputCustomItem', { detail: id }));
  };

  return () => (
    <button type='button' className='fake-a error' onClick={removeItem}>
      [-]
    </button>
  );
}

interface ListInputCustomProps<T> {
  items: T[];
  renderItemInput: (item: T | null, renderRemoveButton: () => ReactNode) => ReactNode;
}

export default function ListInputCustom<T>({ items, renderItemInput }: ListInputCustomProps<T>) {
  const [itemInputs, setItemInputs] = useState(
    items.map((item, id) => ({ id, node: renderItemInput(item, removeButtonRenderer(id)) })),
  );

  useEffect(() => {
    setItemInputs(
      items.map((item, id) => ({ id, node: renderItemInput(item, removeButtonRenderer(id)) })),
    );
  }, [items, renderItemInput]);

  useEffect(() => {
    const removeItemListener = (event: Event) => {
      setItemInputs((prev) =>
        prev.filter((itemInput) => itemInput.id !== (event as CustomEvent<number>).detail),
      );
    };

    // TODO only allows one ListInputCustom in the DOM at a time
    document.addEventListener('removeListInputCustomItem', removeItemListener);
    return () => document.removeEventListener('removeListInputCustomItem', removeItemListener);
  }, []);

  const addItemInput = () =>
    setItemInputs((prev) => {
      const id = prev.length;
      return prev.concat({ id, node: renderItemInput(null, removeButtonRenderer(id)) });
    });

  return (
    <>
      {itemInputs.map((itemInput) => (
        <Fragment key={itemInput.id}>{itemInput.node}</Fragment>
      ))}
      <button type='button' className='fake-a success' onClick={addItemInput}>
        [+]
      </button>
    </>
  );
}
