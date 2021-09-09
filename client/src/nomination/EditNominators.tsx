import type { Dispatch, SetStateAction } from 'react';
import { useState } from 'react';
import type { ResponseError } from 'superagent';
import { apiErrorMessage, updateNominators } from '../api';
import type { FormSubmitHandler } from '../dom-helpers';
import { Form } from '../dom-helpers';
import type { GameMode, INomination, IUserWithoutRoles, PartialWithId } from '../interfaces';
import { Modal } from '../Modal';
import { UserInline } from '../UserInline';

interface EditNominatorsProps {
  captainsApi: readonly [
    { [P in GameMode]?: IUserWithoutRoles[] } | undefined,
    ResponseError | undefined,
  ];
  nomination: INomination;
  onNominationUpdate: (nomination: PartialWithId<INomination>) => void;
}

export default function EditNominators(props: EditNominatorsProps) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <button type='button' onClick={() => setModalOpen(true)} className='fake-a'>
        Edit
      </button>
      <Modal close={() => setModalOpen(false)} open={modalOpen}>
        <h2>Nominators</h2>
        <EditNominatorsForm {...props} setModalOpen={setModalOpen} />
      </Modal>
    </>
  );
}

interface EditNominatorsFormProps extends EditNominatorsProps {
  setModalOpen: Dispatch<SetStateAction<boolean>>;
}

function EditNominatorsForm({
  captainsApi,
  nomination,
  onNominationUpdate,
  setModalOpen,
}: EditNominatorsFormProps) {
  const [busy, setBusy] = useState(false);

  if (captainsApi[1] != null) {
    return (
      <span className='panic'>Failed to load captains: {apiErrorMessage(captainsApi[1])}</span>
    );
  }

  if (captainsApi[0] == null) {
    return <span>Loading captains...</span>;
  }

  const captains = captainsApi[0][nomination.game_mode];

  if (captains == null || captains.length === 0) {
    return <span>There are no captains for this game mode.</span>;
  }

  const onSubmit: FormSubmitHandler = (form, then) => {
    return updateNominators(nomination.id, form.nominatorIds)
      .then((response) => onNominationUpdate(response.body))
      .then(then)
      .catch((error) => window.alert(apiErrorMessage(error))) // TODO: show error better
      .finally(() => setModalOpen(false));
  };

  return (
    <Form busyState={[busy, setBusy]} onSubmit={onSubmit}>
      <table>
        {captains.map((captain) => (
          <tr key={captain.id}>
            <td>
              <input
                type='checkbox'
                name='nominatorIds'
                value={captain.id}
                data-value-type='int'
                defaultChecked={nomination.nominators.find((n) => n.id === captain.id) != null}
              />
            </td>
            <td>
              <UserInline user={captain} />
            </td>
          </tr>
        ))}
      </table>
      <button type='submit' className='modal-submit-button'>
        {busy ? 'Updating...' : 'Update'}
      </button>
    </Form>
  );
}
