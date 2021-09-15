import { Fragment, useState } from 'react';
import { alertApiErrorMessage, apiErrorMessage, getSettings, updateSettings, useApi } from './api';
import type { FormSubmitHandler } from './dom-helpers';
import { Form } from './dom-helpers';
import { gameModeLongName, gameModes } from './osu-helpers';

export default function Settings() {
  const [busy, setBusy] = useState(false);
  const [settings, settingsError, setSettings] = useApi(getSettings);

  if (settingsError != null) {
    return <span className='panic'>Failed to load settings: {apiErrorMessage(settingsError)}</span>;
  }

  if (settings == null) {
    return <span>Loading settings...</span>;
  }

  const onSubmit: FormSubmitHandler = (form, then) => {
    return updateSettings(form)
      .then((response) => setSettings(response.body))
      .then(then)
      .catch(alertApiErrorMessage);
  };

  return (
    <>
      <h1>Site settings</h1>
      <Form busyState={[busy, setBusy]} onSubmit={onSubmit}>
        <div className='form-grid'>
          {gameModes.map((gameMode) => {
            const inputName = `hideNominationStatus.${gameMode}`;

            return (
              <Fragment key={gameMode}>
                <label htmlFor={inputName}>
                  Hide nomination status for {gameModeLongName(gameMode)}
                </label>
                <input
                  type='checkbox'
                  name={inputName}
                  data-value-type='check'
                  defaultChecked={settings.hideNominationStatus?.[gameMode] ?? false}
                />
              </Fragment>
            );
          })}
          {gameModes.map((gameMode) => {
            const inputName = `discordWebhook.${gameMode}`;

            return (
              <Fragment key={gameMode}>
                <label htmlFor={inputName}>
                  Discord announcement URL for {gameModeLongName(gameMode)}
                </label>
                <input
                  type='text'
                  name={inputName}
                  defaultValue={settings.discordWebhook?.[gameMode] ?? undefined}
                  className='full-width'
                />
              </Fragment>
            );
          })}
          {gameModes.map((gameMode) => {
            const inputName = `defaultVotingThreshold.${gameMode}`;

            return (
              <Fragment key={gameMode}>
                <label htmlFor={inputName}>
                  Default voting threshold for {gameModeLongName(gameMode)}
                </label>
                <input
                  type='number'
                  required
                  name={inputName}
                  data-value-type='decimal'
                  min={0}
                  max={1}
                  step={0.01}
                  defaultValue={settings.defaultVotingThreshold?.[gameMode] ?? undefined}
                />
              </Fragment>
            );
          })}
          <label htmlFor='localInteropSecret'>Local interop secret</label>
          <input
            type='text'
            required
            name='localInteropSecret'
            defaultValue={settings.localInteropSecret ?? undefined}
            size={30}
          />
        </div>
        <button type='submit'>{busy ? 'Updating...' : 'Update'}</button>
      </Form>
    </>
  );
}
