import type { Dispatch, FormEvent, MouseEvent, PropsWithChildren, SetStateAction} from 'react';
import { useEffect, useRef, useState } from 'react';
import { dateFromString, mySqlDateTime } from './date-format';

export function classNames(classOptions: Record<string, boolean>): string {
  return Object.entries(classOptions)
    .filter((entry) => entry[1])
    .map((entry) => entry[0])
    .join(' ');
}

function setFormDisabled(form: HTMLFormElement, disabled: boolean) {
  const controls = form.elements as any; // TODO: typing
  const controlsCount = controls.length;

  for (let i = 0; i < controlsCount; i++) {
    const control = controls[i];

    if ('disabled' in control)
      control.disabled = disabled;
  }
}

export type FormSubmitHandler = (values: Record<string, any>, then: () => void, inputs: HTMLFormControlsCollection) => Promise<void> | null;

function wrapCast<T>(fn: (value: string) => T) {
  return (value: string) => value.length === 0 ? null : fn(value);
}

const valueCasts = {
  bool: wrapCast((value) => value !== '0'),
  date: wrapCast((value) => dateFromString(value)),
  decimal: wrapCast(parseFloat),
  int: wrapCast(parseInt),
  mySqlDate: wrapCast((value) => mySqlDateTime(value)),
  string: wrapCast((value) => value),
};

type FormProps = PropsWithChildren<{
  busyState: [boolean, Dispatch<SetStateAction<boolean>>];
  className?: string;
  keepAfterSubmit?: boolean;
  onSubmit: FormSubmitHandler;
}>;

export function Form({
  busyState: [busy, setBusy],
  children,
  className,
  keepAfterSubmit,
  onSubmit,
}: FormProps) {
  const [submitValue, setSubmitValue] = useState<string>();
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (ref.current != null)
      setFormDisabled(ref.current, busy);
  }, [busy]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);

    const form = event.currentTarget;
    const controls = form.elements;
    const controlsCount = controls.length;
    const values: Record<string, any> = {};

    if (submitValue != null) {
      values.submitValue = submitValue;
    }

    for (let i = 0; i < controlsCount; i++) {
      const control = controls[i] as any; // TODO: typing
      const arrayType = !!control.dataset.array || control.type === 'checkbox';

      if (control.type === 'submit')
        continue;

      if (arrayType && values[control.name] == null)
        values[control.name] = [];

      if (!control.checked && (control.type === 'checkbox' || control.type === 'radio'))
        continue;

      const value = valueCasts[control.dataset.valueType as keyof typeof valueCasts ?? 'string'](control.value);

      if (arrayType) {
        if (value != null)
          values[control.name].push(value);
      } else
        values[control.name] = value;
    }

    const maybePromise = onSubmit(
      values,
      () => {
        if (!keepAfterSubmit)
          form.reset();
      },
      controls,
    );

    if (maybePromise == null)
      setBusy(false);
    else
      maybePromise.finally(() => setBusy(false));
  };

  const handleSubmitButtonClick = (event: MouseEvent) => {
    if (event.target instanceof HTMLButtonElement && event.target.type === 'submit') {
      setSubmitValue(event.target.dataset.submitValue || undefined);
    }
  };

  return (
    <form
      className={className}
      onClick={handleSubmitButtonClick}
      onSubmit={handleSubmit}
      ref={ref}
    >
      {children}
    </form>
  );
}
