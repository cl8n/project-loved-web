import { gameModeLongName, gameModes } from 'loved-bridge/beatmaps/gameMode';
import { RankedStatus } from 'loved-bridge/beatmaps/rankedStatus';
import type { Round } from 'loved-bridge/tables';
import { PacksState, Role } from 'loved-bridge/tables';
import type { Dispatch, SetStateAction } from 'react';
import { useState } from 'react';
import { alertApiErrorMessage, markPackUploaded } from '../api';
import type { INominationWithPoll, IRound, PartialWithId } from '../interfaces';
import { useOsuAuth } from '../osuAuth';
import { hasRole } from '../permissions';

interface ButtonsProps {
  onRoundUpdate: (round: PartialWithId<Round>) => void;
  round: Round;
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

function UploadInfo({ nominations, round }: Pick<PackStatusProps, 'nominations' | 'round'>) {
  const gameModePackNames = ['osu!', 'osu!taiko', 'osu!catch', 'osu!mania'] as const;
  // TODO: shouldn't be here and will be wrong if any modes or rounds are skipped
  let packNumber = (round.id - 109) * 4 + 1;

  return (
    <div>
      <p>
        Pack tag range: <b>LR{packNumber}</b> – <b>LR{packNumber + 3}</b>
      </p>
      <h3>Upload commands</h3>
      {[...gameModes].reverse().map((gameMode) => {
        const beatmapsetIdsString = nominations
          .filter((nomination) => nomination.game_mode === gameMode)
          .map((nomination) => nomination.beatmapset_id)
          .join(',');
        const packName = `Project Loved: ${round.name} (${gameModePackNames[gameMode]})`;

        return (
          <div key={gameMode} className='block-margin'>
            {gameModeLongName(gameMode)}:
            <br />
            <pre>
              .create-pack "{packName}" "LR{packNumber++}" {beatmapsetIdsString} --overwrite
              --ruleset {gameMode}
            </pre>
          </div>
        );
      })}
    </div>
  );
}

interface PackStatusProps {
  nominations: INominationWithPoll[];
  onRoundUpdate: (round: PartialWithId<Round>) => void;
  round: IRound;
}

export default function PackStatus({ nominations, onRoundUpdate, round }: PackStatusProps) {
  const [showingUploadInfo, setShowingUploadInfo] = useState(false);

  if (round.ignore_packs_checks) {
    return;
  }

  if (round.packs_state === PacksState.notUploaded) {
    const allLocked = Object.values(round.game_modes).every(
      (roundGameMode) => roundGameMode.nominations_locked,
    );

    return (
      <>
        <span className={allLocked ? 'error' : undefined}>
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

  if (round.packs_state === PacksState.uploadedInitial) {
    const allLovedOrFailed = nominations.every(
      (nomination) =>
        nomination.poll != null &&
        nomination.poll.result_no != null &&
        nomination.poll.result_yes != null &&
        (nomination.beatmapset.ranked_status === RankedStatus.loved ||
          nomination.poll.result_yes / (nomination.poll.result_no + nomination.poll.result_yes) <
            round.game_modes[nomination.game_mode].voting_threshold),
    );

    return (
      <>
        <span className={allLovedOrFailed ? 'error' : 'pending'}>
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

  if (round.packs_state === PacksState.uploadedFinal) {
    return <span className='success'>Beatmap packs uploaded</span>;
  }
}
