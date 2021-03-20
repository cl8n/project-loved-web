import { Dispatch, SetStateAction, useEffect, useRef } from 'react';

export function setProperty<T, K extends keyof T>(
  setter: Dispatch<SetStateAction<T>>,
  property: K,
  value: T[K]
) {
  setter((prevState) => {
    return {
      ...prevState,
      [property]: value,
    };
  });
}

export function usePrevious<T>(value: T) {
  const ref = useRef<T>();

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}
