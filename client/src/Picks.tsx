import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ResponseError } from 'superagent';
import { addNomination, apiErrorMessage, deleteNomination, getAssignees, getCaptains, getNominations, lockNominations, updateExcludedBeatmaps, updateNominationAssignees, updateNominationDescription, updateNominationMetadata, updateNominationOrder, useApi } from './api';
import { autoHeightRef } from './auto-height';
import { BBCode } from './BBCode';
import { BeatmapInline } from './BeatmapInline';
import { Form, FormSubmitHandler } from './dom-helpers';
import { AssigneeType, DescriptionState, GameMode, ICaptain, INomination, INominationWithPollResult, IRound, IUser, IUserWithoutRoles, MetadataState, ModeratorState, PartialWithId } from './interfaces';
import { Modal } from './Modal';
import { Never } from './Never';
import { Orderable } from './Orderable';
import { gameModeLongName, gameModes } from './osu-helpers';
import { useOsuAuth } from './osuAuth';
import { canWriteAs, isCaptainForMode } from './permissions';
import Header from './round/Header';
import { UserInline } from './UserInline';
import Help from "./Help";
import EditNominators from './nomination/EditNominators';
import ListInput from './ListInput';
import ListInline from './ListInline';
import StatusLine from './nomination/StatusLine';
import { dateFromString } from './date-format';
import EditModeration from './nomination/EditModeration';

export function Picks() {
  const authUser = useOsuAuth().user;
  const params = useParams() as { round: string; };
  const roundId = parseInt(params.round);
  const [roundInfo, roundInfoError, setRoundInfo] = useApi(getNominations, [roundId]);
  const assigneesApi = useApi(getAssignees, [], undefined, authUser != null && (canWriteAs(authUser, 'news') || canWriteAs(authUser, 'metadata') || canWriteAs(authUser, 'moderator')));
  const captainsApi = useApi(getCaptains, [], undefined, authUser != null && canWriteAs(authUser, 'captain'));
  // TODO: Split by gamemode
  const [ordering, setOrdering] = useState(false);

  if (authUser == null)
    return <Never />;

  if (roundInfoError != null)
    return <span className='panic'>Failed to load round and nominations: {apiErrorMessage(roundInfoError)}</span>;

  if (roundInfo == null)
    return <span>Loading round and nominations...</span>;

  const { nominations, round } = roundInfo;
  const nominationsByGameMode: { [K in GameMode]: INominationWithPollResult[] } = { 0: [], 1: [], 2: [], 3: [] };

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
  const onNominationsLock = (gameMode: GameMode, lock: boolean) => {
    setRoundInfo((prev) => {
      const prevRound = prev!.round;
      prevRound.game_modes[gameMode].nominations_locked = lock;

      return {
        nominations: prev!.nominations,
        round: prevRound,
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

  const nominationsLocked = (gameMode: GameMode) => {
    return round.game_modes[gameMode].nominations_locked;
  };
  const toggleLock = (gameMode: GameMode) => {
    const lock = !nominationsLocked(gameMode);

    lockNominations(round.id, gameMode, lock)
      .then(() => onNominationsLock(gameMode, lock))
      .catch((error) => window.alert(apiErrorMessage(error))); // TODO: show error better
  };

  const canAdd = (gameMode: GameMode) => {
    return !round.done && !nominationsLocked(gameMode) && isCaptainForMode(authUser, gameMode);
  };
  const canLock = (gameMode: GameMode) => {
    return !round.done && (isCaptainForMode(authUser, gameMode) || canWriteAs(authUser, 'news'));
  };
  const canOrder = canAdd;

  const pollsOpened = round.polls_started_at != null && new Date() > dateFromString(round.polls_started_at);

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
          {canAdd(gameMode) &&
            <AddNomination gameMode={gameMode} onNominationAdd={onNominationAdd} roundId={round.id} />
          }
          {(canOrder(gameMode) || canLock(gameMode)) &&
            <div className='flex-left'>
              {canOrder(gameMode) &&
                <button type='button' onClick={() => setOrdering((prev) => !prev)}>
                  {ordering ? 'Done ordering' : 'Change order'}
                </button>
              }
              {canLock(gameMode) && (
                nominationsLocked(gameMode) ? (
                  <button type='button' onClick={() => toggleLock(gameMode)}>
                    Unlock nominations
                  </button>
                ) : (
                  <>
                    <button type='button' className='angry' onClick={() => toggleLock(gameMode)}>
                      Lock nominations
                    </button>
                    <span className='important-bad'>← Press this when all nominations are added!</span>
                  </>
                )
              )}
            </div>
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
                  captainsApi={[captainsApi[0], captainsApi[1]]}
                  locked={nominationsLocked(gameMode)}
                  nomination={nomination}
                  onNominationDelete={onNominationDelete}
                  onNominationUpdate={onNominationUpdate}
                  parentGameMode={parent?.game_mode}
                  pollsOpened={pollsOpened}
                  round={round}
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
  captainsApi: readonly [{ [P in GameMode]?: ICaptain[] } | undefined, ResponseError | undefined];
  locked: boolean;
  nomination: INominationWithPollResult;
  onNominationDelete: (nominationId: number) => void;
  onNominationUpdate: (nomination: PartialWithId<INomination>) => void;
  parentGameMode?: GameMode;
  pollsOpened: boolean;
  round: IRound;
};

function Nomination({ assigneesApi, captainsApi, locked, nomination, onNominationDelete, onNominationUpdate, parentGameMode, pollsOpened, round }: NominationProps) {
  const authUser = useOsuAuth().user;

  if (authUser == null)
    return <Never />;

  const deleteSelf = () => {
    if (!window.confirm('Are you sure you want to delete this nomination?'))
      return;

    deleteNomination(nomination.id)
      .then(() => onNominationDelete(nomination.id))
      .catch((error) => window.alert(apiErrorMessage(error))); // TODO: show error better
  };

  let failedVoting = false;
  let votingResult: boolean | undefined;

  if (nomination.poll_result != null) {
    const { result_no, result_yes } = nomination.poll_result;
    const yesFraction = result_yes / (result_no + result_yes);

    failedVoting = yesFraction < round.game_modes[nomination.game_mode].voting_threshold;
    votingResult = !failedVoting;
  }

  const isNominator = canWriteAs(authUser, ...nomination.nominators.map((n) => n.id));
  const isMetadataAssignee = canWriteAs(authUser, ...nomination.metadata_assignees.map((a) => a.id));
  const isModeratorAssignee = canWriteAs(authUser, ...nomination.moderator_assignees.map((a) => a.id));

  const descriptionDone = nomination.description_state === DescriptionState.reviewed;
  const descriptionStarted = nomination.description != null;
  const metadataDone = nomination.metadata_state === MetadataState.good;
  const metadataStarted = nomination.metadata_state !== MetadataState.unchecked;
  const moderationDone = nomination.moderator_state === ModeratorState.good || nomination.moderator_state === ModeratorState.notAllowed;
  const moderationStarted = nomination.moderator_state !== ModeratorState.unchecked;

  const canAssignMetadata = !round.done && !(failedVoting && nomination.metadata_assignees.length === 0) && !metadataDone && canWriteAs(authUser, 'metadata', 'news');
  const canAssignModeration = !round.done && !(failedVoting && nomination.moderator_assignees.length === 0) && !moderationDone && canWriteAs(authUser, 'moderator', 'news');
  const canDelete = !round.done && !locked && !descriptionStarted && !metadataStarted && !moderationStarted && isNominator;
  const canEditDescription = !round.done && ((!descriptionDone && isCaptainForMode(authUser, nomination.game_mode)) || (descriptionStarted && canWriteAs(authUser, 'news')));
  const canEditDifficulties = !round.done && !locked && !metadataDone && isCaptainForMode(authUser, nomination.game_mode);
  const canEditMetadata = !round.done && !failedVoting && !metadataDone && (isMetadataAssignee || canWriteAs(authUser, 'news'));
  const canEditModeration = !round.done && !failedVoting && !moderationDone && isModeratorAssignee;
  const canEditNominators = !round.done && !locked && isNominator;

  return (
    <div className='box nomination'>
      <div className='flex-bar'>
        <span>
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
        <span className='flex-no-shrink'>
          Nominated by {' '}
          <ListInline
            array={nomination.nominators}
            none='nobody'
            render={(user) => <UserInline noId user={user} />}
          />
          {canEditNominators &&
            <>
              {' — '}
              <EditNominators
                captainsApi={captainsApi}
                nomination={nomination}
                onNominationUpdate={onNominationUpdate}
              />
            </>
          }
        </span>
      </div>
      <div className='flex-left'>
        <span className='flex-grow'>
          by {' '}
          <ListInline
            array={nomination.beatmapset_creators}
            none='nobody'
            render={(user) => <UserInline noId user={user} />}
          />
        </span>
        {canEditMetadata &&
          <EditMetadata
            metadataStarted={metadataStarted}
            nomination={nomination}
            onNominationUpdate={onNominationUpdate}
          />
        }
        <span className='flex-no-shrink'>
          Metadata assignees: {' '}
          <ListInline
            array={nomination.metadata_assignees}
            render={(user) => <UserInline noId user={user} />}
          />
          {canAssignMetadata &&
            <>
              {' — '}
              <EditAssignees
                assignees={nomination.metadata_assignees}
                candidatesApi={[assigneesApi[0], assigneesApi[2]]}
                nominationId={nomination.id}
                onNominationUpdate={onNominationUpdate}
                type={AssigneeType.metadata}
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
        {!round.ignore_moderator_checks && (
          <>
            {canEditModeration && (
              <EditModeration
                moderationStarted={moderationStarted}
                nomination={nomination}
                onNominationUpdate={onNominationUpdate}
              />
            )}
            <span className='flex-no-shrink'>
              Moderator assignees: {' '}
              <ListInline
                array={nomination.moderator_assignees}
                render={(user) => <UserInline noId user={user} />}
              />
              {canAssignModeration &&
                <>
                  {' — '}
                  <EditAssignees
                    assignees={nomination.moderator_assignees}
                    candidatesApi={[assigneesApi[1], assigneesApi[2]]}
                    nominationId={nomination.id}
                    onNominationUpdate={onNominationUpdate}
                    type={AssigneeType.moderator}
                  />
                </>
              }
            </span>
          </>
        )}
      </div>
      {parentGameMode != null &&
        <div style={{ fontStyle: 'italic' }}>
          Parent nomination in {gameModeLongName(parentGameMode)}
        </div>
      }
      <StatusLine
        ignoreModeratorChecks={round.ignore_moderator_checks}
        locked={locked}
        nomination={nomination}
        pollsOpened={pollsOpened}
        votingResult={votingResult}
      />
      <Description
        author={nomination.description_author}
        canEdit={canEditDescription}
        nominationId={nomination.id}
        onNominationUpdate={onNominationUpdate}
        text={nomination.description}
      />
    </div>
  );
}

type EditMetadataProps = {
  metadataStarted: boolean;
  nomination: INomination;
  onNominationUpdate: (nomination: PartialWithId<INomination>) => void;
};

function nameFromUser(user: IUserWithoutRoles) {
  return user.name;
}

function renderUser(user: IUserWithoutRoles) {
  return <UserInline user={user} />;
}

function EditMetadata({ metadataStarted, nomination, onNominationUpdate }: EditMetadataProps) {
  const [busy, setBusy] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const onSubmit: FormSubmitHandler = (form, then) => {
    return updateNominationMetadata(nomination.id, form.state, form.artist, form.title, form.creators)
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
        className={`flex-no-shrink fake-a${metadataStarted ? '' : ' important-bad'}`}
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
                  <option value={MetadataState.unchecked}>Not checked</option>
                  <option value={MetadataState.needsChange}>Needs change, posted on discussion</option>
                  <option value={MetadataState.good}>All good!</option>
                </select>
              </td>
            </tr>
            <tr>
              <td><label htmlFor='artist'>Romanized artist override</label></td>
              <td><input type='text' name='artist' defaultValue={nomination.overwrite_artist} /></td>
            </tr>
            <tr>
              <td><label htmlFor='title'>Romanized title override</label></td>
              <td><input type='text' name='title' defaultValue={nomination.overwrite_title} /></td>
            </tr>
            <tr>
              <td>
                <label htmlFor='creators'>
                  Creators
                </label>
                {' '}
                <Help text='Do not list creators for excluded difficulties or other game modes. Even the mapset host can be removed if necessary.' />
              </td>
              <td>
                <ListInput
                  items={nomination.beatmapset_creators}
                  itemValue={nameFromUser}
                  itemRender={renderUser}
                  name='creators'
                  placeholder='Username'
                  type='text'
                  valueType='string'
                />
              </td>
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

const assigneeTypeNames = {
  [AssigneeType.metadata]: 'Metadata',
  [AssigneeType.moderator]: 'Moderator',
} as const;

type EditAssigneesProps = {
  assignees: IUserWithoutRoles[];
  candidatesApi: readonly [IUserWithoutRoles[] | undefined, ResponseError | undefined];
  nominationId: number;
  onNominationUpdate: (nomination: PartialWithId<INomination>) => void;
  type: AssigneeType;
};

function EditAssignees({ assignees, candidatesApi, nominationId, onNominationUpdate, type }: EditAssigneesProps) {
  const [busy, setBusy] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const onSubmit: FormSubmitHandler = (form, then) => {
    return updateNominationAssignees(nominationId, type, form.assigneeIds)
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

    if (candidatesApi[0].length === 0)
      return <span>There is nobody with this role to assign.</span>;

    return (
      <Form busyState={[busy, setBusy]} onSubmit={onSubmit}>
        <table>
          {candidatesApi[0].map((user) => (
            <tr key={user.id}>
              <td>
                <input
                  type='checkbox'
                  name='assigneeIds'
                  value={user.id}
                  data-value-type='int'
                  defaultChecked={assignees.find((a) => a.id === user.id) != null}
                />
              </td>
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
        className={`fake-a${assignees.length === 0 ? ' important-bad' : ''}`}
      >
        Edit
      </button>
      <Modal
        close={() => setModalOpen(false)}
        open={modalOpen}
      >
        <h2>{assigneeTypeNames[type]} assignees</h2>
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
  author?: IUserWithoutRoles;
  canEdit: boolean;
  nominationId: number;
  onNominationUpdate: (nomination: PartialWithId<INomination>) => void;
  text?: string;
};

function Description({ author, canEdit, nominationId, onNominationUpdate, text }: DescriptionProps) {
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
      .catch((error) => window.alert(apiErrorMessage(error))) // TODO: show error better
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
      {text == null
        ? (
          <>
            No description
            {canEdit &&
              <>
                {' — '}
                <button
                  type='button'
                  className='fake-a important-bad'
                  onClick={() => setEditing(true)}
                >
                  Edit
                </button>
              </>
            }
          </>
        ) : (
          <>
            <div style={{ marginBottom: '0.25em' }}>
              Description by <UserInline noId user={author! /* TODO: type properly */} />
              {canEdit &&
                <>
                  {' — '}
                  <button
                    type='button'
                    className='fake-a'
                    onClick={() => setEditing(true)}
                  >
                    Edit
                  </button>
                </>
              }
            </div>
            <BBCode text={text} />
          </>
        )
      }
    </p>
  );
}
