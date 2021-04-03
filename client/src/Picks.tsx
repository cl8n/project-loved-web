import { ReactChild, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ResponseError } from 'superagent';
import { addNomination, apiErrorMessage, deleteNomination, getAssignees, getNominations, updateExcludedBeatmaps, updateMetadataAssignee, updateModeratorAssignee, updateNominationDescription, updateNominationMetadata, updateNominationOrder, useApi } from './api';
import { autoHeightRef } from './auto-height';
import { BBCode } from './BBCode';
import { BeatmapInline } from './BeatmapInline';
import { Form, FormSubmitHandler } from './dom-helpers';
import { DescriptionState, GameMode, INomination, IRound, IUser, MetadataState, ModeratorState, PartialWithId } from './interfaces';
import { Modal } from './Modal';
import { Never } from './Never';
import { Orderable } from './Orderable';
import { gameModeLongName, gameModes } from './osu-helpers';
import { useOsuAuth } from './osuAuth';
import { canWriteAs, isCaptainForMode } from './permissions';
import Header from './round/Header';
import { UserInline } from './UserInline';
import Help from "./Help";

type ListInlineProps<T> = {
  array: T[];
  none?: ReactChild;
  render: (item: T) => ReactChild;
}

function ListInline<T>({ array, none, render }: ListInlineProps<T>) {
  if (array.length === 0)
    return <>{none ?? 'None'}</>;

  return (
    <>
      {array.map((item, i, array) => (
        <>
          {render(item)}
          {i < array.length - 1 && ', '}
        </>
      ))}
    </>
  );
}

export function Picks() {
  const authUser = useOsuAuth().user;
  const params = useParams() as { round: string; };
  const roundId = parseInt(params.round);
  const [roundInfo, roundInfoError, setRoundInfo] = useApi(getNominations, [roundId]);
  const assigneesApi = useApi(getAssignees, [], undefined, authUser != null && (canWriteAs(authUser, 'news') || canWriteAs(authUser, 'metadata') || canWriteAs(authUser, 'moderator')));
  // TODO: Split by gamemode
  const [ordering, setOrdering] = useState(false);

  if (authUser == null)
    return <Never />;

  if (roundInfoError != null)
    return <span className='panic'>Failed to load round and nominations: {apiErrorMessage(roundInfoError)}</span>;

  if (roundInfo == null)
    return <span>Loading round and nominations...</span>;

  const { nominations, round } = roundInfo;
  const nominationsByGameMode: { [K in GameMode]: INomination[] } = { 0: [], 1: [], 2: [], 3: [] };

  for (const nomination of nominations)
    nominationsByGameMode[nomination.game_mode].push(nomination);

  // TODO: useReducer or useCallback
  const onNominationAdd = (nomination: INomination) => {
    setRoundInfo((prev) => {
      return {
        nominations: prev!.nominations
          .concat(nomination)
          .sort((a, b) => a.id - b.id)
          .sort((a, b) => a.order - b.order),
        round: prev!.round,
      };
    });
  };
  const onNominationMove = (gameMode: GameMode, oldIndex: number, newIndex: number) => {
    const orders: { [nominationId: number]: number } = {};

    nominationsByGameMode[gameMode].forEach((nomination, index) => {
      if (index === oldIndex)
        index = newIndex;
      else if (oldIndex < index && index <= newIndex)
        index--;
      else if (newIndex <= index && index < oldIndex)
        index++;

      orders[nomination.id] = index;
    });

    updateNominationOrder(orders)
      .then(() => setRoundInfo((prev) => {
        return {
          nominations: prev!.nominations
            .map((nomination) => {
              if (nomination.game_mode === gameMode)
                nomination.order = orders[nomination.id];

              return nomination;
            })
            .sort((a, b) => a.id - b.id)
            .sort((a, b) => a.order - b.order),
          round: prev!.round,
        };
      }))
      .catch((error) => window.alert(apiErrorMessage(error))); // TODO: show error better
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
  const onRoundUpdate = (round: PartialWithId<IRound>) => {
    setRoundInfo((prev) => {
      return {
        nominations: prev!.nominations,
        round: Object.assign(prev!.round, round),
      };
    });
  };

  // TODO: Also check if the round is done
  const canOrder = (gameMode: GameMode) => {
    return canWriteAs(authUser, 'news') || isCaptainForMode(authUser, gameMode);
  };

  return (
    <>
      <Header
        canEdit={canWriteAs(authUser, 'news')}
        onRoundUpdate={onRoundUpdate}
        round={round}
      />
      {gameModes.map((gameMode) => (
        <div key={gameMode} className='content-block'>
          <h2>{gameModeLongName(gameMode)}</h2>
          {isCaptainForMode(authUser, gameMode) &&
            <AddNomination gameMode={gameMode} onNominationAdd={onNominationAdd} roundId={round.id} />
          }
          {canOrder(gameMode) &&
            <button type='button' onClick={() => setOrdering((prev) => !prev)}>
              {ordering ? 'Done ordering' : 'Change order'}
            </button>
          }
          <Orderable
            enabled={ordering && canOrder(gameMode)}
            onMoveChild={(i, j) => onNominationMove(gameMode, i, j)}
          >
            {nominationsByGameMode[gameMode].map((nomination) => {
              const parent = nomination.parent_id == null ? undefined : nominations.find((parent) => parent.id === nomination.parent_id);

              return (
                <Nomination
                  key={nomination.id}
                  assigneesApi={[assigneesApi[0]?.metadatas, assigneesApi[0]?.moderators, assigneesApi[1]]}
                  nomination={nomination}
                  onNominationDelete={onNominationDelete}
                  onNominationUpdate={onNominationUpdate}
                  parentGameMode={parent?.game_mode}
                />
              );
            })}
          </Orderable>
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
      form.beatmapsetId,
      gameMode,
      form.parentId,
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
        <input type='number' name='beatmapsetId' required data-value-type='int' />
        <span>
          <label htmlFor='parentId'>Parent nomination ID </label>
          <Help text="If this map is being nominated because another mode's captains picked it first, set this field to the original mode's nomination ID" />
        </span>
        <input type='number' name='parentId' data-value-type='int' />
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

  return (
    <div className='box nomination'>
      <div className='flex-left'>
        <span className='flex-grow'>
          <h3 className='nomination-title'>
            <BeatmapInline
              artist={nomination.overwrite_artist}
              beatmapset={nomination.beatmapset}
              gameMode={nomination.game_mode}
              title={nomination.overwrite_title}
            />
            {' '} [#{nomination.id}]
          </h3>
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
        {nomination.description_author != null &&
          <span className='flex-no-shrink'>Description by <UserInline noId user={nomination.description_author} /></span>
        }
        <span className='flex-no-shrink'>Nominated by <UserInline noId user={nomination.nominator} /></span>
      </div>
      <div className='flex-left'>
        <span className='flex-grow'>
          by {' '}
          <ListInline
            array={nomination.beatmapset_creators}
            none='Nobody'
            render={(user) => <UserInline noId user={user} />}
          />
        </span>
        {canEditMetadata &&
          <EditMetadata
            nomination={nomination}
            onNominationUpdate={onNominationUpdate}
          />
        }
        <span className='flex-no-shrink'>
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
        <span className='flex-grow'>
          Excluded diffs: {' '}
          <ListInline
            array={nomination.beatmaps.filter((beatmap) => beatmap.excluded)}
            render={(beatmap) => beatmap.version}
          />
          {canEditDifficulties &&
            <>
              {' — '}
              <EditDifficulties nomination={nomination} onNominationUpdate={onNominationUpdate} />
            </>
          }
        </span>
        <span className='flex-no-shrink'>
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
  nomination: INomination;
  onNominationUpdate: (nomination: PartialWithId<INomination>) => void;
};

function EditMetadata({ nomination, onNominationUpdate }: EditMetadataProps) {
  const [busy, setBusy] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const onSubmit: FormSubmitHandler = (form, then) => {
    return updateNominationMetadata(nomination.id, form.state, form.artist, form.title)
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
        className={`flex-no-shrink fake-a${nomination.metadata_state === MetadataState.unchecked ? ' important-bad' : ''}`}
      >
        Edit metadata
      </button>
      <Modal
        close={() => setModalOpen(false)}
        open={modalOpen}
      >
        <h2>
          <BeatmapInline
            artist={nomination.overwrite_artist}
            beatmapset={nomination.beatmapset}
            title={nomination.overwrite_title}
          />
          {' metadata'}
        </h2>
        <Form busyState={[busy, setBusy]} onSubmit={onSubmit}>
          <table>
            <tr>
              <td><label htmlFor='state'>State</label></td>
              <td>
                <select name='state' required defaultValue={nomination.metadata_state} data-value-type='int' key={nomination.metadata_state /* TODO: Workaround for https://github.com/facebook/react/issues/21025 */}>
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

  // TODO: check performance of creating this every render
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
        className={`fake-a${assigneeId == null ? ' important-bad' : ''}`}
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
  nomination: INomination;
  onNominationUpdate: (nomination: PartialWithId<INomination>) => void;
};

function EditDifficulties({ nomination, onNominationUpdate }: EditDifficultiesProps) {
  const [busy, setBusy] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const onSubmit: FormSubmitHandler = (form, then) => {
    return updateExcludedBeatmaps(nomination.id, form.excluded)
      .then(() => {
        onNominationUpdate({
          id: nomination.id,
          beatmaps: nomination.beatmaps
            .map((beatmap) => { return { ...beatmap, excluded: form.excluded.includes(beatmap.id) }; })
        });
      })
      .then(then)
      .catch((error) => window.alert(apiErrorMessage(error)))
      .finally(() => setModalOpen(false));
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
        <h2>Excluded difficulties</h2>
        <Form busyState={[busy, setBusy]} onSubmit={onSubmit}>
          <table>
            {nomination.beatmaps.map((beatmap) => (
              <tr key={beatmap.id}>
                <td>
                  <input
                    type='checkbox'
                    name='excluded'
                    value={beatmap.id}
                    data-value-type='int'
                    defaultChecked={beatmap.excluded}
                  />
                </td>
                <td>{beatmap.version} — {beatmap.star_rating.toFixed(2)}★</td>
              </tr>
            ))}
          </table>
          <button type='submit' className='modal-submit-button'>
            {busy ? 'Updating...' : 'Update'}
          </button>
        </Form>
      </Modal>
    </>
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
      autoHeightRef(descriptionRef.current);
      descriptionRef.current!.focus();
    }
  }, [editing]);

  const onSubmit: FormSubmitHandler = (form, then) => {
    return updateNominationDescription(nominationId, form.description)
      .then((response) => onNominationUpdate(response.body))
      .then(then)
      .catch(() => {}) // TODO: show error
      .finally(() => setEditing(false));
  };

  return editing ? (
    <Form busyState={[busy, setBusy]} onSubmit={onSubmit}>
      <div className='textarea-wrapper'>
        <textarea name='description' defaultValue={text} ref={descriptionRef} />
        <div className='description-buttons'>
          <span>Use BBCode for formatting</span>
          <button type='submit'>{busy ? 'Updating...' : 'Update'}</button>
          <button type='button' onClick={() => setEditing(false)}>Cancel</button>
        </div>
      </div>
    </Form>
  ) : (
    <p>
      <BBCode text={text ?? 'No description'} />
      {canEdit &&
        <>
          {' — '}
          <button
            type='button'
            className={`fake-a${text == null ? ' important-bad' : ''}`}
            onClick={() => setEditing(true)}
          >
            Edit
          </button>
        </>
      }
    </p>
  );
}
