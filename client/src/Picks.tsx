import { Fragment, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ResponseError } from 'superagent';
import { addNomination, apiErrorMessage, deleteNomination, getAssignees, getNominations, updateMetadataAssignee, updateModeratorAssignee, updateNominationDescription, updateNominationMetadata, useApi } from './api';
import { autoHeight, Form, FormSubmitHandler } from './dom-helpers';
import { DescriptionState, GameMode, INomination, IUser, MetadataState, ModeratorState, PartialWithId } from './interfaces';
import { Modal } from './Modal';
import { Never } from './Never';
import { gameModeLongName, gameModes, gameModeShortName } from './osu-helpers';
import { useOsuAuth } from './osuAuth';
import { canWriteAs, isCaptainForMode } from './permissions';
import { UserInline } from './UserInline';

export function Picks() {
  const authUser = useOsuAuth().user;
  const params = useParams() as { round: string; };
  const roundId = parseInt(params.round);
  const [roundInfo, roundInfoError, setRoundInfo] = useApi(getNominations, [roundId]);
  const assigneesApi = useApi(getAssignees, [], undefined, authUser != null && (canWriteAs(authUser, 'news') || canWriteAs(authUser, 'metadata') || canWriteAs(authUser, 'moderator')));

  if (authUser == null)
    return <Never />;

  if (roundInfoError != null)
    return <span className='panic'>Failed to load round and nominations: {apiErrorMessage(roundInfoError)}</span>;

  if (roundInfo == null)
    return <span>Loading round and nominations...</span>;

  // TODO: useReducer or useCallback
  const onNominationAdd = (nomination: INomination) => {
    setRoundInfo((prev) => {
      return {
        nominations: prev!.nominations.concat(nomination),
        round: prev!.round,
      };
    });
  };
  const onNominationDelete = (nominationId: number) => {
    setRoundInfo((prev) => {
      return {
        nominations: prev!.nominations.filter((nomination) => nomination.id !== nominationId),
        round: prev!.round,
      };
    });
  };
  const onNominationUpdate = (nomination: PartialWithId<INomination>) => {
    setRoundInfo((prev) => {
      const existing = prev!.nominations.find((existing) => existing.id === nomination.id)!;
      Object.assign(existing, nomination);

      return {
        nominations: prev!.nominations,
        round: prev!.round,
      };
    });
  };

  const { nominations, round } = roundInfo;

  //TODO
  const notDone = true;
  const percent = 60;
  const posted = false;

  const nominationsByGameMode: { [K in GameMode]: INomination[] } = { 0: [], 1: [], 2: [], 3: [] };

  for (const nomination of nominations)
    nominationsByGameMode[nomination.game_mode].push(nomination);

  return (
    <>
      <div className='content-block'>
        <h1>{round.name} [#{round.id}]</h1>
        <div className='flex-bar'>
          <span>{posted ? 'Posted' : 'Posting'} at {round.news_posted_at}</span>
          {notDone &&
            <span className='progress'>
              (not working yet) 6 / 10 ({percent}%)
            </span>
          }
        </div>
      </div>
      {gameModes.map((gameMode) => (
        <div key={gameMode} className='content-block'>
          <h2>{gameModeLongName(gameMode)}</h2>
          {isCaptainForMode(authUser, gameMode) &&
            <AddNomination gameMode={gameMode} onNominationAdd={onNominationAdd} roundId={round.id} />
          }
          {nominationsByGameMode[gameMode].map((nomination) => {
            const parent = nomination.parent_id == null ? undefined : nominations.find((parent) => parent.id === nomination.parent_id);
            return <Nomination
              key={nomination.id}
              assigneesApi={[assigneesApi[0]?.metadatas, assigneesApi[0]?.moderators, assigneesApi[1]]}
              nomination={nomination}
              onNominationDelete={onNominationDelete}
              onNominationUpdate={onNominationUpdate}
              parentGameMode={parent?.game_mode}
            />;
          })}
        </div>
      ))}
    </>
  );
}

type AddNominationProps = {
  gameMode: GameMode;
  onNominationAdd: (nomination: INomination) => void;
  roundId: number;
}

function AddNomination({ gameMode, onNominationAdd, roundId }: AddNominationProps) {
  const [busy, setBusy] = useState(false);

  const onSubmit: FormSubmitHandler = (form, then) => {
    return addNomination(
      parseInt(form.beatmapsetId),
      gameMode,
      form.parentId.length === 0 ? undefined : parseInt(form.parentId),
      roundId,
    )
      .then((response) => onNominationAdd(response.body))
      .then(then)
      .catch((error) => window.alert(apiErrorMessage(error))); // TODO: show error
  };

  // TODO class should probably go on the form itself
  // TODO better way to set parent ID lol
  return (
    <Form busyState={[busy, setBusy]} onSubmit={onSubmit}>
      <p className='flex-left'>
        <label htmlFor='beatmapsetId'>Beatmapset ID</label>
        <input type='number' name='beatmapsetId' required />
        <span>
          <label htmlFor='parentId'>Parent nomination ID </label>
          <span
            className='fake-a'
            style={{ cursor: 'help' }}
            title="If this map is being nominated because another mode's captains picked it first, set this field to the original mode's nomination ID"
          >
            [?]
          </span>
        </span>
        <input type='number' name='parentId' />
        <button type='submit'>
          {busy ? 'Adding...' : 'Add'}
        </button>
      </p>
    </Form>
  );
}

type NominationProps = {
  assigneesApi: readonly [IUser[] | undefined, IUser[] | undefined, ResponseError | undefined];
  nomination: INomination;
  onNominationDelete: (nominationId: number) => void;
  onNominationUpdate: (nomination: PartialWithId<INomination>) => void;
  parentGameMode?: GameMode;
};

function Nomination({ assigneesApi, nomination, onNominationDelete, onNominationUpdate, parentGameMode }: NominationProps) {
  const authUser = useOsuAuth().user;

  if (authUser == null)
    return <Never />;

  const deleteSelf = () => {
    if (!window.confirm('Are you sure you want to delete this nomination?'))
      return;

    deleteNomination(nomination.id)
      .then(() => onNominationDelete(nomination.id))
      .catch(() => {}); // TODO: show error
  };

  const descriptionDone = nomination.description_state === DescriptionState.reviewed;
  const metadataDone = nomination.metadata_state === MetadataState.good;
  const moderationDone = nomination.moderator_state === ModeratorState.good;
  const allDone = descriptionDone && metadataDone && moderationDone;
  const anyDone = descriptionDone || metadataDone || moderationDone;

  // TODO support array for canwriteas
  const canAssignMetadata = authUser != null && !metadataDone && (canWriteAs(authUser, 'news') || canWriteAs(authUser, 'metadata'));
  const canAssignModeration = authUser != null && !moderationDone && (canWriteAs(authUser, 'news') || canWriteAs(authUser, 'moderator'));
  const canDelete = !anyDone && canWriteAs(authUser, nomination.nominator.id);
  const canEditDescription = !descriptionDone && isCaptainForMode(authUser, nomination.game_mode);
  const canEditDifficulties = !metadataDone && isCaptainForMode(authUser, nomination.game_mode);
  const canEditMetadata = !metadataDone && canWriteAs(authUser, nomination.metadata_assignee?.id);
  const canEditModeration = !moderationDone && canWriteAs(authUser, nomination.moderator_assignee?.id);

  const displayArtist = nomination.overwrite_artist ?? nomination.beatmapset.artist;
  const displayTitle = nomination.overwrite_title ?? nomination.beatmapset.title;

  return (
    <div className='box nomination'>
      <div className='flex-left'>
        <h3 style={{ flexGrow: 1 }}>
          <a href={`https://osu.ppy.sh/beatmapsets/${nomination.beatmapset.id}#${gameModeShortName(nomination.game_mode)}`}>
            {displayArtist} - {displayTitle}
          </a>
          {' '} [#{nomination.id}]
        </h3>
        {nomination.description_author != null &&
          <span>Description by <UserInline noId user={nomination.description_author} /></span>
        }
        <span>
          Nominated by <UserInline noId user={nomination.nominator} />
          {canDelete &&
            <>
              {' — '}
              <button
                type='button'
                className='error fake-a'
                onClick={deleteSelf}
              >
                Delete
              </button>
            </>
          }
        </span>
      </div>
      <div className='flex-left'>
        <span style={{ flexGrow: 1 }}>
          by {' '}
          {nomination.beatmapset_creators.length === 0
            ? 'Nobody!'
            : nomination.beatmapset_creators.map((creator, i, arr) => (
                <span>
                  <UserInline noId user={creator} />
                  {i < arr.length - 1 && ', '}
                </span>
              ))
          }
        </span>
        {canEditMetadata &&
          <EditMetadata
            modalTitle={`${displayArtist} - ${displayTitle}`}
            nomination={nomination}
            onNominationUpdate={onNominationUpdate}
          />
        }
        <span>
          Metadata assignee: {nomination.metadata_assignee == null ? 'None' : <UserInline noId user={nomination.metadata_assignee} />}
          {canAssignMetadata &&
            <>
              {' — '}
              <EditAssignee
                assigneeId={nomination.metadata_assignee?.id}
                candidatesApi={[assigneesApi[0], assigneesApi[2]]}
                nominationId={nomination.id}
                onNominationUpdate={onNominationUpdate}
                type='Metadata'
              />
            </>
          }
        </span>
      </div>
      <div className='flex-left'>
        <span style={{ flexGrow: 1 }}>
          Excluded diffs: (not working yet)
          {canEditDifficulties &&
            <>
              {' — '}
              <EditDifficulties />
            </>
          }
        </span>
        <span>
          Moderator assignee: {nomination.moderator_assignee == null ? 'None' : <UserInline noId user={nomination.moderator_assignee} />}
          {canAssignModeration &&
            <>
              {' — '}
              <EditAssignee
                assigneeId={nomination.moderator_assignee?.id}
                candidatesApi={[assigneesApi[1], assigneesApi[2]]}
                nominationId={nomination.id}
                onNominationUpdate={onNominationUpdate}
                type='Moderator'
              />
            </>
          }
        </span>
      </div>
      {parentGameMode != null &&
        <div style={{ fontStyle: 'italic' }}>
          Parent nomination in {gameModeLongName(parentGameMode)}
        </div>
      }
      <Description canEdit={canEditDescription} nominationId={nomination.id} onNominationUpdate={onNominationUpdate} text={nomination.description} />
    </div>
  );
}

type EditMetadataProps = {
  modalTitle: string;
  nomination: INomination;
  onNominationUpdate: (nomination: PartialWithId<INomination>) => void;
};

function EditMetadata({ modalTitle, nomination, onNominationUpdate }: EditMetadataProps) {
  const [busy, setBusy] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const onSubmit: FormSubmitHandler = (form, then) => {
    return updateNominationMetadata(nomination.id, parseInt(form.state), form.artist.length === 0 ? null : form.artist, form.title.length === 0 ? null : form.title)
      .then((response) => onNominationUpdate(response.body))
      .then(then)
      .catch((error) => window.alert(apiErrorMessage(error)))
      .finally(() => setModalOpen(false));
  };

  return (
    <>
      <button
        type='button'
        onClick={() => setModalOpen(true)}
        className={`fake-a${nomination.metadata_state === MetadataState.unchecked ? ' important-bad' : ''}`}
      >
        Edit metadata
      </button>
      <Modal
        close={() => setModalOpen(false)}
        open={modalOpen}
      >
        <h2>{modalTitle}</h2>
        <Form busyState={[busy, setBusy]} onSubmit={onSubmit}>
          <table>
            <tr>
              <td><label htmlFor='state'>State</label></td>
              <td>
                <select name='state' required defaultValue={nomination.metadata_state}>
                  <option value='0'>Not checked</option>
                  <option value='1'>Needs change, posted on discussion</option>
                  <option value='2'>All good!</option>
                </select>
              </td>
            </tr>
            <tr>
              <td><label htmlFor='artist'>Artist override</label></td>
              <td><input type='text' name='artist' defaultValue={nomination.overwrite_artist} /></td>
            </tr>
            <tr>
              <td><label htmlFor='title'>Title override</label></td>
              <td><input type='text' name='title' defaultValue={nomination.overwrite_title} /></td>
            </tr>
            <tr>
              <td><label htmlFor='creators'>Creators (not working yet)</label></td>
            </tr>
          </table>
          <button type='submit' className='modal-submit-button'>
            {busy ? 'Updating...' : 'Update'}
          </button>
        </Form>
      </Modal>
    </>
  );
}

type EditAssigneeProps = {
  assigneeId?: number;
  candidatesApi: readonly [IUser[] | undefined, ResponseError | undefined];
  nominationId: number;
  onNominationUpdate: (nomination: PartialWithId<INomination>) => void;
  type: 'Metadata' | 'Moderator';
};

function EditAssignee({ assigneeId, candidatesApi, nominationId, onNominationUpdate, type }: EditAssigneeProps) {
  const [busy, setBusy] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const onSubmit: FormSubmitHandler = (form, then) => {
    return (type === 'Metadata' ? updateMetadataAssignee : updateModeratorAssignee)(nominationId, form.userId === 'none' ? null : parseInt(form.userId))
      .then((response) => onNominationUpdate(response.body))
      .then(then)
      .catch((error) => window.alert(apiErrorMessage(error)))
      .finally(() => setModalOpen(false));
  };

  const FormOrError = () => {
    if (candidatesApi[1] != null)
      return <span className='panic'>Failed to load assignees: {apiErrorMessage(candidatesApi[1])}</span>;

    if (candidatesApi[0] == null)
      return <span>Loading assignees...</span>;

    return (
      <Form busyState={[busy, setBusy]} onSubmit={onSubmit}>
        <table>
          <tr>
            <td><input type='radio' name='userId' value='none' defaultChecked={assigneeId == null} /></td>
            <td>None</td>
          </tr>
          {candidatesApi[0].map((user) => (
            <tr key={user.id}>
              <td><input type='radio' name='userId' value={user.id} defaultChecked={user.id === assigneeId} /></td>
              <td><UserInline user={user} /></td>
            </tr>
          ))}
        </table>
        <button type='submit' className='modal-submit-button'>
          {busy ? 'Updating...' : 'Update'}
        </button>
      </Form>
    );
  };

  return (
    <>
      <button
        type='button'
        onClick={() => setModalOpen(true)}
        className='fake-a'
      >
        Edit
      </button>
      <Modal
        close={() => setModalOpen(false)}
        open={modalOpen}
      >
        <h2>{type} assignee</h2>
        <FormOrError />
      </Modal>
    </>
  );
}

type EditDifficultiesProps = {

};

function EditDifficulties({}: EditDifficultiesProps) {
  return (
    <button type='button' className='fake-a'>Edit</button>
  );
}

type DescriptionProps = {
  canEdit: boolean;
  nominationId: number;
  onNominationUpdate: (nomination: PartialWithId<INomination>) => void;
  text?: string;
};

function Description({ canEdit, nominationId, onNominationUpdate, text }: DescriptionProps) {
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) {
      autoHeight(descriptionRef.current!);
      descriptionRef.current!.focus();
    }
  }, [editing]);

  const onSubmit: FormSubmitHandler = (form, then) => {
    return updateNominationDescription(nominationId, form.description.length === 0 ? null : form.description)
      .then((response) => onNominationUpdate(response.body))
      .then(then)
      .catch(() => {}) // TODO: show error
      .finally(() => setEditing(false));
  };

  return editing ? (
    <Form busyState={[busy, setBusy]} onSubmit={onSubmit}>
      <div className='textarea-wrapper'>
        <textarea name='description' defaultValue={text} ref={descriptionRef} onChange={(e) => autoHeight(e.currentTarget)} />
        <div className='description-buttons'>
          <span>Use BBCode for formatting</span>
          <button type='submit'>{busy ? 'Updating...' : 'Update'}</button>
          <button type='button' onClick={() => setEditing(false)}>Cancel</button>
        </div>
      </div>
    </Form>
  ) : (
    <p style={{ whiteSpace: 'pre-wrap' }}>
      {text ?? 'No description'}{canEdit &&
        <>
          {' — '}
          <button type='button' className='fake-a' onClick={() => setEditing(true)}>Edit</button>
        </>
      }
    </p>
  );
}
