import { diff_match_patch } from 'diff-match-patch';
import {
  GameMode,
  gameModeLongName,
  gameModes,
  gameModeShortName,
} from 'loved-bridge/beatmaps/gameMode';
import type { NominationDescriptionEdit } from 'loved-bridge/tables';
import {
  AssigneeType,
  DescriptionState,
  MetadataState,
  ModeratorState,
  Role,
} from 'loved-bridge/tables';
import type { FormEvent } from 'react';
import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { FormattedDate } from 'react-intl';
import { Link, useParams } from 'react-router-dom';
import type { ResponseError } from 'superagent';
import {
  addNomination,
  alertApiErrorMessage,
  apiErrorMessage,
  deleteNomination,
  getAssignees,
  getCaptains,
  getNominations,
  lockNominations,
  searchBeatmapsets,
  updateApiObject,
  updateExcludedBeatmaps,
  updateNominationAssignees,
  updateNominationDescription,
  updateNominationMetadata,
  updateNominationOrder,
  useApi,
} from './api';
import { autoHeightRef } from './auto-height';
import { BBCode } from './BBCode';
import { BeatmapInline, beatmapText } from './BeatmapInline';
import type { FormSubmitHandler } from './dom-helpers';
import { Form } from './dom-helpers';
import Help from './Help';
import type {
  IBeatmapset,
  INomination,
  INominationWithPoll,
  IRound,
  IUser,
  PartialWithId,
} from './interfaces';
import ListInline from './ListInline';
import ListInput from './ListInput';
import { Modal } from './Modal';
import EditModeration from './nomination/EditModeration';
import EditNominators from './nomination/EditNominators';
import type { NominationProgressWarning } from './nomination/progress';
import {
  nominationProgressWarningMessages,
  nominationProgressWarnings,
} from './nomination/progress';
import StatusLine from './nomination/StatusLine';
import { Orderable } from './Orderable';
import { useOsuAuth } from './osuAuth';
import { canActAs, hasRole } from './permissions';
import { useEffectExceptOnMount } from './react-helpers';
import Header from './round/Header';
import { UserInline } from './UserInline';
import useTitle from './useTitle';

function orderingReducer(
  prevState: Record<GameMode, boolean>,
  gameMode: GameMode,
): Record<GameMode, boolean> {
  return {
    ...prevState,
    [gameMode]: !prevState[gameMode],
  };
}

export function Picks() {
  const authUser = useOsuAuth().user!;
  const params = useParams() as { round: string };
  const roundId = parseInt(params.round);
  const [roundInfo, roundInfoError, setRoundInfo] = useApi(getNominations, [roundId]);
  useTitle(roundInfo == null ? `Round #${roundId}` : roundInfo.round.name);
  const assigneesApi = useApi(getAssignees, [], {
    condition: hasRole(authUser, [Role.newsAuthor, Role.metadata, Role.moderator]),
  });
  const captainsApi = useApi(getCaptains, [], {
    condition: hasRole(authUser, Role.captain),
  });
  const [ordering, toggleOrdering] = useReducer(orderingReducer, {
    [GameMode.osu]: false,
    [GameMode.taiko]: false,
    [GameMode.catch]: false,
    [GameMode.mania]: false,
  });
  const [showTodo, setShowTodo] = useState(false);
  const nominationOtherGameModesMissingParentCache = useMemo(() => {
    const cache: Record<INomination['id'], GameMode[]> = {};

    if (roundInfo != null) {
      for (const nomination of roundInfo.nominations) {
        const gameModesMissingParent: GameMode[] = [];

        if (nomination.parent_id == null) {
          for (const gameMode of gameModes) {
            if (gameMode === nomination.game_mode) {
              continue;
            }

            if (
              roundInfo.nominations.some(
                (nomination2) =>
                  nomination2.game_mode === gameMode &&
                  nomination2.beatmapset_id === nomination.beatmapset_id &&
                  nomination2.parent_id == null,
              )
            ) {
              gameModesMissingParent.push(gameMode);
            }
          }
        }

        cache[nomination.id] = gameModesMissingParent;
      }
    }

    return cache;
  }, [roundInfo]);
  const nominationOtherGameModesWithBeatmapsCache = useMemo(() => {
    const cache: Record<INomination['id'], GameMode[]> = {};

    if (roundInfo != null) {
      for (const nomination of roundInfo.nominations) {
        const gameModesWithBeatmaps: GameMode[] = [];

        for (const gameMode of gameModes) {
          if (gameMode === nomination.game_mode) {
            continue;
          }

          if (
            nomination.beatmaps.some((beatmap) => beatmap.game_mode === gameMode) &&
            !roundInfo.nominations.some(
              (nomination2) =>
                nomination2.beatmapset_id === nomination.beatmapset_id &&
                nomination2.game_mode === gameMode,
            )
          ) {
            gameModesWithBeatmaps.push(gameMode);
          }
        }

        cache[nomination.id] = gameModesWithBeatmaps;
      }
    }

    return cache;
  }, [roundInfo]);
  const nominationProgressWarningsCache = useMemo(() => {
    const cache: Record<INomination['id'], Set<NominationProgressWarning>> = {};

    if (roundInfo != null) {
      for (const nomination of roundInfo.nominations) {
        cache[nomination.id] = roundInfo.round.done
          ? new Set()
          : nominationProgressWarnings(nomination, roundInfo.round, authUser);
      }
    }

    return cache;
  }, [authUser, roundInfo]);

  if (roundInfoError != null) {
    return (
      <span className='panic'>
        Failed to load round and nominations: {apiErrorMessage(roundInfoError)}
      </span>
    );
  }

  if (roundInfo == null) {
    return <span>Loading round and nominations...</span>;
  }

  const { nominations, round } = roundInfo;
  const nominationsByGameMode: { [K in GameMode]: INominationWithPoll[] } = {
    0: [],
    1: [],
    2: [],
    3: [],
  };

  for (const nomination of nominations) {
    nominationsByGameMode[nomination.game_mode].push(nomination);
  }

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
    const orders: Record<number, number> = {};

    nominationsByGameMode[gameMode].forEach((nomination, index) => {
      if (index === oldIndex) {
        index = newIndex;
      } else if (oldIndex < index && index <= newIndex) {
        index--;
      } else if (newIndex <= index && index < oldIndex) {
        index++;
      }

      orders[nomination.id] = index;
    });

    updateNominationOrder(orders)
      .then(() =>
        setRoundInfo((prev) => {
          return {
            nominations: prev!.nominations
              .map((nomination) => {
                if (nomination.game_mode === gameMode) {
                  nomination.order = orders[nomination.id];
                }

                return nomination;
              })
              .sort((a, b) => a.id - b.id)
              .sort((a, b) => a.order - b.order),
            round: prev!.round,
          };
        }),
      )
      .catch(alertApiErrorMessage);
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
  const onRoundUpdate = (round: Omit<IRound, 'game_modes'> & { news_author: IUser }) => {
    setRoundInfo((prev) => {
      return {
        nominations: prev!.nominations,
        round: { ...prev!.round, ...round },
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
      .catch(alertApiErrorMessage);
  };

  const canAdd = (gameMode: GameMode) =>
    !round.done && !nominationsLocked(gameMode) && hasRole(authUser, Role.captain, gameMode);
  const canEditRound = !round.done && hasRole(authUser, Role.newsAuthor);
  const canLock = (gameMode: GameMode) =>
    !round.done &&
    nominationsByGameMode[gameMode].length > 0 &&
    (hasRole(authUser, Role.newsAuthor) || hasRole(authUser, Role.captain, gameMode));
  const canOrder = (gameMode: GameMode) =>
    canAdd(gameMode) && nominationsByGameMode[gameMode].length > 1;

  const roundGameModes: GameMode[] = Object.keys(round.game_modes).map((gameMode) =>
    parseInt(gameMode, 10),
  );

  const showNomination = (nomination: INomination) =>
    !showTodo ||
    (ordering[nomination.game_mode] && canOrder(nomination.game_mode)) ||
    canAdd(nomination.game_mode) ||
    nominationProgressWarningsCache[nomination.id].size > 0;
  const showNominations = (gameMode: GameMode) =>
    !showTodo ||
    ordering[gameMode] ||
    (ordering[gameMode] && canOrder(gameMode)) ||
    canAdd(gameMode) ||
    nominationsByGameMode[gameMode].some(showNomination);

  return (
    <>
      <Header
        canEdit={canEditRound}
        nominationsWithWarnings={
          Object.values(nominationProgressWarningsCache).filter((warnings) => warnings.size > 0)
            .length
        }
        onRoundUpdate={onRoundUpdate}
        round={round}
        showTodo={showTodo}
        setShowTodo={setShowTodo}
      />
      {roundGameModes.filter(showNominations).map((gameMode) => (
        <div key={gameMode} className='content-block'>
          <h2>
            {gameModeLongName(gameMode)}
            {nominationsLocked(gameMode) && <span className='success'> ✓ Locked</span>}
          </h2>
          {canAdd(gameMode) && (
            <AddNomination
              gameMode={gameMode}
              onNominationAdd={onNominationAdd}
              roundId={round.id}
            />
          )}
          {(canOrder(gameMode) || canLock(gameMode)) && (
            <div className='flex-left'>
              {canOrder(gameMode) && (
                <button type='button' onClick={() => toggleOrdering(gameMode)}>
                  {ordering[gameMode] ? 'Done ordering' : 'Change order'}
                </button>
              )}
              {canLock(gameMode) &&
                (nominationsLocked(gameMode) ? (
                  <button type='button' onClick={() => toggleLock(gameMode)}>
                    Unlock nominations
                  </button>
                ) : (
                  <button type='button' className='angry' onClick={() => toggleLock(gameMode)}>
                    Lock nominations
                  </button>
                ))}
            </div>
          )}
          <Orderable
            enabled={ordering[gameMode] && canOrder(gameMode)}
            onMoveChild={(i, j) => onNominationMove(gameMode, i, j)}
          >
            {nominationsByGameMode[gameMode].filter(showNomination).map((nomination) => {
              const parent =
                nomination.parent_id == null
                  ? undefined
                  : nominations.find((parent) => parent.id === nomination.parent_id);

              return (
                <Nomination
                  key={nomination.id}
                  assigneesApi={[
                    assigneesApi[0]?.metadatas,
                    assigneesApi[0]?.moderators,
                    assigneesApi[1],
                  ]}
                  captainsApi={[captainsApi[0], captainsApi[1]]}
                  gameModesMissingParent={nominationOtherGameModesMissingParentCache[nomination.id]}
                  gameModesWithBeatmaps={nominationOtherGameModesWithBeatmapsCache[nomination.id]}
                  locked={nominationsLocked(gameMode)}
                  nomination={nomination}
                  onNominationDelete={onNominationDelete}
                  onNominationUpdate={onNominationUpdate}
                  parentGameMode={parent?.game_mode}
                  progressWarnings={nominationProgressWarningsCache[nomination.id]}
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

interface AddNominationProps {
  gameMode: GameMode;
  onNominationAdd: (nomination: INomination) => void;
  roundId: number;
}

function AddNomination({ gameMode, onNominationAdd, roundId }: AddNominationProps) {
  const [busy, setBusy] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchRequest, setSearchRequest] = useState<ReturnType<typeof searchBeatmapsets>>();
  const [searchResults, setSearchResults] = useState<IBeatmapset[]>();
  const [selectedBeatmapset, setSelectedBeatmapset] = useState<IBeatmapset>();

  useEffectExceptOnMount(() => {
    if (searchInputRef.current != null && selectedBeatmapset == null) {
      searchInputRef.current.focus();
    }
  }, [selectedBeatmapset]);

  const onSearchInput = (event: FormEvent<HTMLInputElement>) => {
    if (searchRequest != null) {
      searchRequest.abort();
    }

    const query = event.currentTarget.value;

    if (query.length === 0) {
      setSearchRequest(undefined);
      setSearchResults(undefined);
      return;
    }

    const request = searchBeatmapsets(query);

    request
      .then((response) => setSearchResults(response.body))
      .catch((error) => error.code !== 'ABORTED' && alertApiErrorMessage(error));

    setSearchRequest(request);
  };
  const onSubmit: FormSubmitHandler = (form, then) => {
    if (selectedBeatmapset == null) {
      window.alert('Select a beatmapset');
      return null;
    }

    return addNomination(selectedBeatmapset.id, gameMode, form.parentId, roundId)
      .then((response) => {
        onNominationAdd(response.body);
        setSearchResults(undefined);
        setSelectedBeatmapset(undefined);
      })
      .then(then)
      .catch(alertApiErrorMessage);
  };

  // TODO class should probably go on the form itself
  // TODO better way to set parent ID lol
  return (
    <Form busyState={[busy, setBusy]} onSubmit={onSubmit}>
      <p className='flex-left'>
        <span>
          <label htmlFor='beatmapset'>Beatmapset</label>{' '}
          <Help>
            If you can't find the beatmapset here, make sure it's been{' '}
            <Link to={`/submissions/${gameModeShortName(gameMode)}`}>submitted</Link> first!
          </Help>
        </span>
        <div className='beatmapset-search'>
          {selectedBeatmapset == null ? (
            <input
              ref={searchInputRef}
              type='text'
              name='beatmapset'
              onInput={onSearchInput}
              placeholder='Enter a beatmapset ID or search by artist, title, and creator'
            />
          ) : (
            <div
              className='beatmapset-search-selection'
              onClick={() => setSelectedBeatmapset(undefined)}
            >
              {beatmapText(selectedBeatmapset, true)}
            </div>
          )}
          {!!searchResults?.length && (
            <div className='beatmapset-search-results'>
              {searchResults.map((beatmapset) => (
                <button
                  key={beatmapset.id}
                  type='button'
                  onClick={() => {
                    setSearchResults(undefined);
                    setSelectedBeatmapset(beatmapset);
                  }}
                >
                  {beatmapText(beatmapset, true)}
                </button>
              ))}
            </div>
          )}
        </div>
        <span>
          <label htmlFor='parentId'>Parent nomination ID</label>{' '}
          <Help>
            If this map is being nominated because another mode's captains picked it first, set this
            field to the original mode's nomination ID
          </Help>
        </span>
        <input type='number' name='parentId' data-value-type='int' />
        <button type='submit'>{busy ? 'Adding...' : 'Add'}</button>
      </p>
    </Form>
  );
}

interface NominationProps {
  assigneesApi: readonly [IUser[] | undefined, IUser[] | undefined, ResponseError | undefined];
  captainsApi: readonly [{ [P in GameMode]?: IUser[] } | undefined, ResponseError | undefined];
  gameModesMissingParent: GameMode[];
  gameModesWithBeatmaps: GameMode[];
  locked: boolean;
  nomination: INominationWithPoll;
  onNominationDelete: (nominationId: number) => void;
  onNominationUpdate: (nomination: PartialWithId<INomination>) => void;
  parentGameMode?: GameMode;
  progressWarnings: Set<NominationProgressWarning>;
  round: IRound;
}

function Nomination({
  assigneesApi,
  captainsApi,
  gameModesMissingParent,
  gameModesWithBeatmaps,
  locked,
  nomination,
  onNominationDelete,
  onNominationUpdate,
  parentGameMode,
  progressWarnings,
  round,
}: NominationProps) {
  const authUser = useOsuAuth().user!;

  const deleteSelf = () => {
    if (!window.confirm('Are you sure you want to delete this nomination?')) {
      return;
    }

    deleteNomination(nomination.id)
      .then(() => onNominationDelete(nomination.id))
      .catch(alertApiErrorMessage);
  };

  let failedVoting = false;
  let votingResult: boolean | undefined;

  if (
    nomination.poll != null &&
    nomination.poll.result_no != null &&
    nomination.poll.result_yes != null
  ) {
    const { result_no, result_yes } = nomination.poll;
    const yesFraction = result_yes / (result_no + result_yes);

    failedVoting = yesFraction < round.game_modes[nomination.game_mode].voting_threshold;
    votingResult = !failedVoting;
  }

  const descriptionDone = nomination.description_state === DescriptionState.reviewed;
  const descriptionStarted = nomination.description != null;
  const hasProgressWarnings = progressWarnings.size > 0;
  const metadataAssigned = nomination.metadata_assignees.length > 0;
  const metadataDone = nomination.metadata_state === MetadataState.good;
  const metadataStarted = nomination.metadata_state !== MetadataState.unchecked;
  const moderationAssigned = nomination.moderator_assignees.length > 0;
  const moderationDone =
    nomination.moderator_state === ModeratorState.good ||
    nomination.moderator_state === ModeratorState.notAllowed;
  const moderationStarted = nomination.moderator_state !== ModeratorState.unchecked;

  const canAssignMetadata =
    !round.done &&
    !(failedVoting && !metadataAssigned) &&
    !metadataDone &&
    hasRole(authUser, [Role.metadata, Role.newsAuthor]);
  const canAssignModeration =
    !round.done &&
    !(failedVoting && !moderationAssigned) &&
    !moderationDone &&
    hasRole(authUser, [Role.moderator, Role.newsAuthor]);
  const canDelete =
    !round.done &&
    nomination.poll == null &&
    !locked &&
    canActAs(
      authUser,
      nomination.nominators.map((n) => n.id),
    );
  const canEditDescription =
    !round.done &&
    (nomination.poll == null
      ? (!descriptionDone && hasRole(authUser, Role.captain, nomination.game_mode)) ||
        (descriptionStarted && hasRole(authUser, Role.newsEditor))
      : hasRole(authUser, Role.newsAuthor));
  const canEditDifficulties =
    !round.done &&
    nomination.poll == null &&
    !locked &&
    !metadataDone &&
    hasRole(authUser, Role.captain, nomination.game_mode);
  const canEditMetadata =
    !round.done &&
    !failedVoting &&
    (canActAs(
      authUser,
      nomination.metadata_assignees.map((a) => a.id),
    ) ||
      hasRole(authUser, Role.newsAuthor));
  const canEditModeration =
    !round.done &&
    !failedVoting &&
    canActAs(
      authUser,
      nomination.moderator_assignees.map((a) => a.id),
    );
  const canEditNominators =
    !round.done &&
    nomination.poll == null &&
    !locked &&
    hasRole(authUser, Role.captain, nomination.game_mode);
  const canForceBeatmapsetUpdate = hasRole(authUser, []);

  return (
    <div className={`box nomination${hasProgressWarnings ? ' nomination--warning' : ''}`}>
      <div className='flex-bar'>
        <span>
          <h3 className='nomination-title'>
            <BeatmapInline
              artist={nomination.overwrite_artist}
              beatmapset={nomination.beatmapset}
              gameMode={nomination.game_mode}
              title={nomination.overwrite_title}
            />{' '}
            [#{nomination.id}]
          </h3>
          {canDelete && (
            <>
              {' — '}
              <button type='button' className='error fake-a' onClick={deleteSelf}>
                Delete
              </button>
            </>
          )}
        </span>
        <span className='flex-no-shrink'>
          Nominated by{' '}
          <ListInline
            array={nomination.nominators}
            none='nobody'
            render={(user) => <UserInline user={user} />}
          />
          {canEditNominators && (
            <>
              {' — '}
              <EditNominators
                captainsApi={captainsApi}
                nomination={nomination}
                onNominationUpdate={onNominationUpdate}
              />
            </>
          )}
        </span>
      </div>
      <div className='flex-left'>
        <span className='flex-grow'>
          by{' '}
          <ListInline
            array={nomination.beatmapset_creators}
            none='nobody'
            render={(user) => <UserInline user={user} />}
          />
        </span>
        {canEditMetadata && (
          <EditMetadata
            metadataStarted={metadataStarted}
            nomination={nomination}
            onNominationUpdate={onNominationUpdate}
          />
        )}
        <span className='flex-no-shrink'>
          Metadata assignees:{' '}
          <ListInline
            array={nomination.metadata_assignees}
            render={(user) => <UserInline user={user} />}
          />
          {canAssignMetadata && (
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
          )}
        </span>
      </div>
      <div className='flex-left'>
        <span className='flex-grow'>
          Excluded diffs:{' '}
          <ListInline
            array={nomination.beatmaps.filter((beatmap) => beatmap.excluded)}
            render={(beatmap) => beatmap.version}
          />
          {canEditDifficulties && (
            <>
              {' — '}
              <EditDifficulties
                nomination={nomination}
                onNominationUpdate={onNominationUpdate}
                round={round}
              />
            </>
          )}
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
              Moderator assignees:{' '}
              <ListInline
                array={nomination.moderator_assignees}
                render={(user) => <UserInline user={user} />}
              />
              {canAssignModeration && (
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
              )}
            </span>
          </>
        )}
      </div>
      {parentGameMode != null && (
        <div style={{ fontStyle: 'italic' }}>
          Parent nomination in {gameModeLongName(parentGameMode)}
        </div>
      )}
      <div className='flex-bar'>
        <StatusLine nomination={nomination} round={round} votingResult={votingResult} />
        {canForceBeatmapsetUpdate && <ForceBeatmapsetUpdate nomination={nomination} />}
      </div>
      <Description
        author={nomination.description_author}
        canEdit={canEditDescription}
        edits={nomination.description_edits}
        nominationId={nomination.id}
        onNominationUpdate={onNominationUpdate}
        text={nomination.description}
      />
      {hasProgressWarnings && (
        <div className='nomination__warnings'>
          {hasRole(authUser, Role.captain, nomination.game_mode, true) && (
            <>
              {gameModesWithBeatmaps.length > 0 && (
                <span>
                  <span className='nomination__warning-icon'>!</span>
                  There are beatmaps in{' '}
                  <ListInline array={gameModesWithBeatmaps.map(gameModeLongName)} /> with no
                  nomination
                </span>
              )}
              {gameModesMissingParent.length > 0 && (
                <span>
                  <span className='nomination__warning-icon'>!</span>
                  Nominations for the same map in{' '}
                  <ListInline array={gameModesMissingParent.map(gameModeLongName)} /> need to be
                  linked via parent ID
                </span>
              )}
            </>
          )}
          {[...progressWarnings].map((warning) => (
            <span key={warning}>
              <span className='nomination__warning-icon'>!</span>
              {nominationProgressWarningMessages[warning]}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

interface EditMetadataProps {
  metadataStarted: boolean;
  nomination: INomination;
  onNominationUpdate: (nomination: PartialWithId<INomination>) => void;
}

function nameFromUser(user: IUser) {
  return user.name;
}

function renderUser(user: IUser) {
  return <UserInline user={user} />;
}

function EditMetadata({ metadataStarted, nomination, onNominationUpdate }: EditMetadataProps) {
  const [busy, setBusy] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const onSubmit: FormSubmitHandler = (form, then) => {
    return updateNominationMetadata(
      nomination.id,
      form.state,
      form.artist,
      form.title,
      form.creators,
    )
      .then((response) => {
        if (
          nomination.metadata_state !== MetadataState.needsChange &&
          response.body.metadata_state === MetadataState.needsChange
        ) {
          window.alert(
            'Make sure to contact the mapper about any required changes! They may not be receiving notifications for discussion posts.',
          );
        }

        onNominationUpdate(response.body);
      })
      .then(then)
      .catch(alertApiErrorMessage)
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
      <Modal close={() => setModalOpen(false)} open={modalOpen}>
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
              <td>
                <label htmlFor='state'>State</label>
              </td>
              <td>
                <select
                  name='state'
                  required
                  defaultValue={nomination.metadata_state}
                  data-value-type='int'
                  key={
                    nomination.metadata_state /* TODO: Workaround for https://github.com/facebook/react/issues/21025 */
                  }
                >
                  <option value={MetadataState.unchecked}>Not checked</option>
                  <option value={MetadataState.needsChange}>
                    Needs change, posted on discussion
                  </option>
                  <option value={MetadataState.good}>All good!</option>
                </select>
              </td>
            </tr>
            <tr>
              <td>
                <label htmlFor='artist'>Romanized artist override</label>
              </td>
              <td>
                <input type='text' name='artist' defaultValue={nomination.overwrite_artist} />
              </td>
            </tr>
            <tr>
              <td>
                <label htmlFor='title'>Romanized title override</label>
              </td>
              <td>
                <input type='text' name='title' defaultValue={nomination.overwrite_title} />
              </td>
            </tr>
            <tr>
              <td>
                <label htmlFor='creators'>Creators</label>{' '}
                <Help>
                  Do not list creators for excluded difficulties or other game modes. Even the
                  mapset host can be removed if necessary.
                </Help>
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

interface EditAssigneesProps {
  assignees: IUser[];
  candidatesApi: readonly [IUser[] | undefined, ResponseError | undefined];
  nominationId: number;
  onNominationUpdate: (nomination: PartialWithId<INomination>) => void;
  type: AssigneeType;
}

function EditAssignees({
  assignees,
  candidatesApi,
  nominationId,
  onNominationUpdate,
  type,
}: EditAssigneesProps) {
  const [busy, setBusy] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const onSubmit: FormSubmitHandler = (form, then) => {
    return updateNominationAssignees(nominationId, type, form.assigneeIds)
      .then((response) => onNominationUpdate(response.body))
      .then(then)
      .catch(alertApiErrorMessage)
      .finally(() => setModalOpen(false));
  };

  // TODO: check performance of creating this every render
  const FormOrError = () => {
    if (candidatesApi[1] != null) {
      return (
        <span className='panic'>Failed to load assignees: {apiErrorMessage(candidatesApi[1])}</span>
      );
    }

    if (candidatesApi[0] == null) {
      return <span>Loading assignees...</span>;
    }

    if (candidatesApi[0].length === 0) {
      return <span>There is nobody with this role to assign.</span>;
    }

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
              <td>
                <UserInline user={user} />
              </td>
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
      <Modal close={() => setModalOpen(false)} open={modalOpen}>
        <h2>{assigneeTypeNames[type]} assignees</h2>
        <FormOrError />
      </Modal>
    </>
  );
}

interface EditDifficultiesProps {
  nomination: INomination;
  onNominationUpdate: (nomination: PartialWithId<INomination>) => void;
  round: IRound;
}

function EditDifficulties({ nomination, onNominationUpdate, round }: EditDifficultiesProps) {
  const [busy, setBusy] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const onSubmit: FormSubmitHandler = (form, then) => {
    return updateExcludedBeatmaps(nomination.id, form.excluded)
      .then((response) =>
        onNominationUpdate({
          ...response.body,
          beatmaps: nomination.beatmaps.map((beatmap) => ({
            ...beatmap,
            excluded: form.excluded.includes(beatmap.id),
          })),
        }),
      )
      .then(then)
      .catch(alertApiErrorMessage)
      .finally(() => setModalOpen(false));
  };

  return (
    <>
      <button
        type='button'
        onClick={() => setModalOpen(true)}
        className={`fake-a${
          !round.ignore_creator_and_difficulty_checks && !nomination.difficulties_set
            ? ' important-bad'
            : ''
        }`}
      >
        Edit
      </button>
      <Modal close={() => setModalOpen(false)} open={modalOpen}>
        <h2>Excluded difficulties</h2>
        <Form busyState={[busy, setBusy]} onSubmit={onSubmit}>
          <table>
            {nomination.beatmaps
              .filter((beatmap) => beatmap.game_mode === nomination.game_mode)
              .map((beatmap) => (
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
                  <td>
                    {beatmap.version} — {beatmap.star_rating.toFixed(2)}★
                  </td>
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

function ForceBeatmapsetUpdate({ nomination }: { nomination: INomination }) {
  const [busy, setBusy] = useState(false);

  const updateBeatmapset = () => {
    setBusy(true);

    updateApiObject('beatmapset', nomination.beatmapset.id)
      .then(() => window.location.reload()) // TODO: update in place...
      .catch(alertApiErrorMessage)
      .finally(() => setBusy(false));
  };

  return (
    <button
      type='button'
      disabled={busy}
      onClick={updateBeatmapset}
      className='flex-no-shrink fake-a'
    >
      {busy ? 'Updating...' : 'Force update beatmapset'}
    </button>
  );
}

interface DescriptionDifferenceProps {
  oldDescription: string;
  newDescription: string;
}

function DescriptionDifference({ oldDescription, newDescription }: DescriptionDifferenceProps) {
  if (oldDescription === newDescription) {
    return <>{newDescription}</>;
  }
  const diffMatch = new diff_match_patch();
  const differences = diffMatch.diff_main(oldDescription, newDescription, false);

  // cleanup
  diffMatch.diff_cleanupSemantic(differences);

  // todo: get a better key
  return (
    <>
      {differences.map((difference, i) => {
        if (difference[0] === 0) {
          return <>{difference[1]}</>;
        } else if (difference[0] === -1) {
          return <del key={i}>{difference[1]}</del>;
        } else if (difference[0] === 1) {
          return <ins key={i}>{difference[1]}</ins>;
        }
      })}
    </>
  );
}

interface DescriptionHistoryProps {
  author?: IUser;
  edits: (NominationDescriptionEdit & { editor: IUser })[];
}

function DescriptionHistory({ author, edits }: DescriptionHistoryProps) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <button type='button' className='fake-a' onClick={() => setModalOpen(true)}>
        Show history
      </button>
      <Modal close={() => setModalOpen(false)} open={modalOpen}>
        <h2>Description history</h2>
        <div className='description-history'>
          {edits.map((edit, index) => {
            const previousDescription =
              index === 0 ? edit.description : edits[index - 1].description;

            return (
              <div key={edit.id} className='description-history-item'>
                <h3 className='description-history-item__title'>
                  Edit by <UserInline user={edit.editor} />
                  {edit.editor_id === author?.id && ' (author)'} on{' '}
                  <FormattedDate dateStyle='long' timeStyle='medium' value={edit.edited_at} />
                </h3>
                {edit.description == null ? (
                  <i>No description</i>
                ) : (
                  <DescriptionDifference
                    oldDescription={previousDescription ?? edit.description}
                    newDescription={edit.description}
                  />
                )}
              </div>
            );
          })}
        </div>
      </Modal>
    </>
  );
}

interface DescriptionProps {
  author?: IUser;
  canEdit: boolean;
  edits: (NominationDescriptionEdit & { editor: IUser })[];
  nominationId: number;
  onNominationUpdate: (nomination: PartialWithId<INomination>) => void;
  text?: string;
}

function Description({
  author,
  canEdit,
  edits,
  nominationId,
  onNominationUpdate,
  text,
}: DescriptionProps) {
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
      .catch(alertApiErrorMessage)
      .finally(() => setEditing(false));
  };

  canEdit &&= !editing;
  const canShowHistory = edits.length > 1;
  const editors = edits
    .map((edit) => edit.editor)
    .filter((u1, i, all) => u1.id !== author?.id && all.findIndex((u2) => u1.id === u2.id) === i);

  return (
    <div className='description'>
      <div className='description__info'>
        {text == null ? (
          <i>No description</i>
        ) : (
          <>
            Description by <UserInline user={author! /* TODO: type properly */} />
            {editors.length > 0 && (
              <>
                {' (edited by '}
                <ListInline array={editors} render={(user) => <UserInline user={user} />} />)
              </>
            )}
          </>
        )}
        {(canEdit || canShowHistory) && ' — '}
        {canEdit && (
          <button
            type='button'
            className={`fake-a${text == null ? ' important-bad' : ''}`}
            onClick={() => setEditing(true)}
          >
            Edit
          </button>
        )}
        {canEdit && canShowHistory && ', '}
        {canShowHistory && <DescriptionHistory author={author} edits={edits} />}
      </div>
      {editing ? (
        <Form busyState={[busy, setBusy]} onSubmit={onSubmit}>
          <div className='textarea-wrapper'>
            <textarea name='description' defaultValue={text} ref={descriptionRef} />
            <div className='description__editor-buttons'>
              <span>Use BBCode for formatting</span>
              <button type='submit'>{busy ? 'Updating...' : 'Update'}</button>
              <button type='button' onClick={() => setEditing(false)}>
                Cancel
              </button>
            </div>
          </div>
        </Form>
      ) : (
        text != null && <BBCode text={text} />
      )}
    </div>
  );
}
