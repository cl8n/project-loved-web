import { DragEvent, ReactElement, useState } from 'react';

type OrderableProps = {
  children: ReactElement[];
  enabled: boolean;
  onMoveChild: (oldIndex: number, newIndex: number) => void;
};

export function Orderable({ children, enabled, onMoveChild }: OrderableProps) {
  const [draggedIndex, setDraggedIndex] = useState<number>();
  const [dropIndex, setDropIndex] = useState<number>();

  const onDragEnter = (index: number) => {
    if (draggedIndex == null)
      return;

    setDropIndex(index);
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();

    if (draggedIndex == null || dropIndex == null || draggedIndex === dropIndex)
      return;

    onMoveChild(draggedIndex, dropIndex);
  };

  const onDragEnd = () => {
    setDraggedIndex(undefined);
    setDropIndex(undefined);
  };

  return (
    <>
      {children.map((child, index) => (
        <div
          className={index === dropIndex ? 'drop-candidate' : ''}
          draggable={enabled}
          key={child.key}
          onDragEnd={onDragEnd}
          onDragEnter={() => onDragEnter(index)}
          onDragOver={(event) => event.preventDefault()}
          onDragStart={() => setDraggedIndex(index)}
          onDrop={onDrop}
        >
          {child}
        </div>
      ))}
    </>
  );
}
