import { useState } from 'react';
import {
  addOrUpdateInteropKey,
  alertApiErrorMessage,
  apiErrorMessage,
  getInteropKey,
  useApi,
} from '../../api';

export default function ClientKey() {
  const [busy, setBusy] = useState(false);
  const [clientKey, clientKeyError, setClientKey] = useApi(getInteropKey);

  if (clientKeyError != null) {
    return (
      <span className='panic'>Failed to load client key: {apiErrorMessage(clientKeyError)}</span>
    );
  }

  if (clientKey === undefined) {
    return <span>Loading client key...</span>;
  }

  return (
    <div className='flex-left'>
      {clientKey != null && <code className={busy ? 'faded' : undefined}>{clientKey}</code>}
      <button
        type='button'
        disabled={busy}
        onClick={() => {
          setBusy(true);

          addOrUpdateInteropKey()
            .then((response) => setClientKey(response.body))
            .catch(alertApiErrorMessage)
            .finally(() => setBusy(false));
        }}
      >
        {clientKey == null
          ? busy
            ? 'Generating client key...'
            : 'Generate client key'
          : busy
          ? 'Regenerating client key...'
          : 'Regenerate client key'}
      </button>
    </div>
  );
}
