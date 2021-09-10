import { useState } from 'react';
import { apiErrorMessage, getSettings, updateSettings, useApi } from './api';
import type { FormSubmitHandler } from './dom-helpers';
import { Form } from './dom-helpers';
import { gameModeLongName, gameModes } from './osu-helpers';

export default function Settings() {
  return (
    <>
      <h1>Site settings</h1>
      <SettingsForm />
    </>
  );
}

function SettingsForm() {
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
      .catch((error) => window.alert(apiErrorMessage(error))); // TODO: show error better
  };

  return (
    <Form busyState={[busy, setBusy]} onSubmit={onSubmit}>
      <table>
        <tbody>
          {gameModes.map((gameMode) => {
            const inputName = `hideNominationStatus.${gameMode}`;

            return (
              <tr key={gameMode}>
                <td>
                  <input
                    type='checkbox'
                    name={inputName}
                    data-value-type='check'
                    defaultChecked={settings.hideNominationStatus?.[gameMode] ?? false}
                  />
                </td>
                <td>
                  <label htmlFor={inputName}>
                    Hide nomination status for {gameModeLongName(gameMode)}
                  </label>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <button type='submit' className='spacer-margin'>
        {busy ? 'Updating...' : 'Update'}
      </button>
    </Form>
  );
}
