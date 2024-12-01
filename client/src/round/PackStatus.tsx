import { gameModeLongName, gameModes } from 'loved-bridge/beatmaps/gameMode';
import { RankedStatus } from 'loved-bridge/beatmaps/rankedStatus';
import { PacksState, Role } from 'loved-bridge/tables';
import type { Dispatch, SetStateAction } from 'react';
import { useState } from 'react';
import { alertApiErrorMessage, markPackUploaded } from '../api';
import type { INominationWithPoll, IRound, PartialWithId } from '../interfaces';
import { useOsuAuth } from '../osuAuth';
import { hasRole } from '../permissions';

function nominationFailedVoting(nomination: INominationWithPoll, round: IRound): boolean {
  return (
    nomination.poll != null &&
    nomination.poll.result_no != null &&
    nomination.poll.result_yes != null &&
    nomination.poll.result_yes / (nomination.poll.result_no + nomination.poll.result_yes) <
      round.game_modes[nomination.game_mode].voting_threshold
  );
}

interface ButtonsProps {
  onRoundUpdate: (round: PartialWithId<IRound>) => void;
  round: IRound;
  setShowingUploadInfo: Dispatch<SetStateAction<boolean>>;
  showingUploadInfo: boolean;
}

function Buttons({ onRoundUpdate, round, setShowingUploadInfo, showingUploadInfo }: ButtonsProps) {
  const authUser = useOsuAuth().user;
  const [busyMarkingUploaded, setBusyMarkingUploaded] = useState(false);

  if (!hasRole(authUser, Role.packUploader)) {
    return;
  }

  return (
    <>
      {' — '}
      <button
        type='button'
        className='fake-a'
        onClick={() => setShowingUploadInfo((prev) => !prev)}
      >
        {showingUploadInfo ? 'Hide upload info' : 'Show upload info'}
      </button>
      {', '}
      <button
        type='button'
        disabled={busyMarkingUploaded}
        className='fake-a button--edit'
        onClick={() => {
          setBusyMarkingUploaded(true);

          markPackUploaded(round.id)
            .then((response) => onRoundUpdate(response.body))
            .catch(alertApiErrorMessage)
            .finally(() => setBusyMarkingUploaded(false));
        }}
      >
        {busyMarkingUploaded ? 'Marking as uploaded...' : 'Mark as uploaded'}
      </button>
    </>
  );
}

interface UploadInfoProps {
  nominations: INominationWithPoll[];
  round: IRound;
}

function UploadInfo({ nominations, round }: UploadInfoProps) {
  const gameModePackNames = ['osu!', 'osu!taiko', 'osu!catch', 'osu!mania'] as const;
  // TODO: shouldn't be here and will be wrong if any modes or rounds are skipped
  let packNumber = (round.id - 109) * 4;

  return (
    <div className='pack-upload-info'>
      <p>
        Pack tag range: <b>LR{packNumber + 1}</b> –{' '}
        <b>LR{packNumber + Object.values(round.game_modes).length}</b>
      </p>
      <h3>Upload commands</h3>
      {[...gameModes].reverse().map((gameMode) => {
        if (!(gameMode in round.game_modes)) {
          return;
        }

        packNumber++;

        const packState = round.game_modes[gameMode].pack_state;

        if (packState === PacksState.uploadedFinal) {
          return;
        }

        const beatmapsetIdsString = nominations
          .filter(
            (nomination) =>
              nomination.game_mode === gameMode && !nominationFailedVoting(nomination, round),
          )
          .map((nomination) => nomination.beatmapset_id)
          .join(',');
        const packName = `Project Loved: ${round.name} (${gameModePackNames[gameMode]})`;

        return (
          <div key={gameMode} className='block-margin'>
            {gameModeLongName(gameMode)}:
            <br />
            <code className='pack-upload-info__command'>
              .create-pack "{packName}" "LR{packNumber}" {beatmapsetIdsString} --ruleset {gameMode}
              {packState !== PacksState.notUploaded && ' --overwrite'}
            </code>
          </div>
        );
      })}
    </div>
  );
}

interface PackStatusProps {
  nominations: INominationWithPoll[];
  onRoundUpdate: (round: PartialWithId<IRound>) => void;
  round: IRound;
}

export default function PackStatus({ nominations, onRoundUpdate, round }: PackStatusProps) {
  const [showingUploadInfo, setShowingUploadInfo] = useState(false);

  if (round.ignore_packs_checks) {
    return;
  }

  const roundGameModes = Object.values(round.game_modes);

  if (roundGameModes.some((roundGameMode) => roundGameMode.pack_state === PacksState.notUploaded)) {
    // If some packs are uploaded but others aren't, this means a round game mode was created after
    // the uploading of some packs, which should never happen
    if (
      roundGameModes.some((roundGameMode) => roundGameMode.pack_state !== PacksState.notUploaded)
    ) {
      return <span className='panic'>Invalid beatmap packs state (some uploaded, some not)</span>;
    }

    const needsUpdate = roundGameModes.every((roundGameMode) => roundGameMode.nominations_locked);

    return (
      <>
        <span className={needsUpdate ? 'error' : undefined}>
          Beatmap packs not uploaded
          <Buttons
            onRoundUpdate={onRoundUpdate}
            round={round}
            setShowingUploadInfo={setShowingUploadInfo}
            showingUploadInfo={showingUploadInfo}
          />
        </span>
        {showingUploadInfo && <UploadInfo nominations={nominations} round={round} />}
      </>
    );
  }

  if (
    roundGameModes.some((roundGameMode) => roundGameMode.pack_state === PacksState.uploadedInitial)
  ) {
    const needsUpdate = roundGameModes.some(
      (roundGameMode) =>
        roundGameMode.pack_state === PacksState.uploadedInitial &&
        nominations
          .filter((nomination) => nomination.game_mode === roundGameMode.game_mode)
          .every(
            (nomination) =>
              nomination.beatmapset.ranked_status === RankedStatus.loved ||
              nominationFailedVoting(nomination, round),
          ),
    );

    return (
      <>
        <span className={needsUpdate ? 'error' : 'pending'}>
          Beatmap packs uploaded (not final version)
          <Buttons
            onRoundUpdate={onRoundUpdate}
            round={round}
            setShowingUploadInfo={setShowingUploadInfo}
            showingUploadInfo={showingUploadInfo}
          />
        </span>
        {showingUploadInfo && <UploadInfo nominations={nominations} round={round} />}
      </>
    );
  }

  return <span className='success'>Beatmap packs uploaded</span>;
}
