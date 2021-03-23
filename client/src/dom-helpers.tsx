import { ChangeEvent, Dispatch, FormEvent, PropsWithChildren, SetStateAction, useEffect, useRef } from 'react';

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
  decimal: wrapCast((value) => parseFloat(value).toFixed(2)),
  int: wrapCast(parseInt),
  string: wrapCast((value) => value),
};

type FormProps = PropsWithChildren<{
  busyState: [boolean, Dispatch<SetStateAction<boolean>>];
  keepAfterSubmit?: boolean;
  onSubmit: FormSubmitHandler;
}>;

export function Form({
  busyState: [busy, setBusy],
  children,
  keepAfterSubmit,
  onSubmit,
}: FormProps) {
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

    for (let i = 0; i < controlsCount; i++) {
      const control = controls[i] as any; // TODO: typing

      if (control.type === 'submit')
        continue;

      if (control.type === 'checkbox' && values[control.name] == null)
        values[control.name] = [];

      if (!control.checked && (control.type === 'checkbox' || control.type === 'radio'))
        continue;

      let value = valueCasts[control.dataset.valueType as keyof typeof valueCasts ?? 'string'](control.value);

      if (control.type === 'checkbox')
        values[control.name].push(value);
      else
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

  return <form ref={ref} onSubmit={handleSubmit}>{children}</form>;
}

export function autoHeight<T extends HTMLElement>(element: T) {
  element.style.height = '5px';
  element.style.height = element.scrollHeight + 'px';
}
