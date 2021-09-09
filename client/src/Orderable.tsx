import type { DragEvent, ReactElement } from 'react';
import { useState } from 'react';

interface OrderableProps {
  children: ReactElement[];
  enabled: boolean;
  onMoveChild: (oldIndex: number, newIndex: number) => void;
}

export function Orderable({ children, enabled, onMoveChild }: OrderableProps) {
  const [draggedIndex, setDraggedIndex] = useState<number>();
  const [dropIndex, setDropIndex] = useState<number>();

  const getClassName = (index: number) => {
    if (index !== dropIndex || draggedIndex == null) return;

    if (index < draggedIndex) return 'drop-bar-top';

    if (index > draggedIndex) return 'drop-bar-bottom';
  };

  const onDragEnter = (index: number) => {
    if (draggedIndex == null) return;

    setDropIndex(index);
  };

  const onDragOver = (event: DragEvent) => {
    if (draggedIndex == null) return;

    event.preventDefault();
  };

  const onDrop = (event: DragEvent) => {
    if (draggedIndex == null || dropIndex == null || draggedIndex === dropIndex) return;

    event.preventDefault();
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
          className={getClassName(index)}
          draggable={enabled}
          key={child.key}
          onDragEnd={onDragEnd}
          onDragEnter={() => onDragEnter(index)}
          onDragOver={onDragOver}
          onDragStart={() => setDraggedIndex(index)}
          onDrop={onDrop}
        >
          {child}
        </div>
      ))}
    </>
  );
}
