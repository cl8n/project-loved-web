import type { GameMode } from 'loved-bridge/beatmaps/gameMode';
import { gameModeLongName } from 'loved-bridge/beatmaps/gameMode';
import { Fragment } from 'react';
import { apiErrorMessage, getNominationsForPlanner, useApi } from '../api';
import type { INominationForPlanner } from '../interfaces';
import Nomination from './Nomination';

interface NominationPlannerProps {
  gameMode: GameMode;
}

export default function NominationPlanner({ gameMode }: NominationPlannerProps) {
  const [nominationInfo, nominationInfoError, setNominationInfo] = useApi(
    getNominationsForPlanner,
    [gameMode],
    {
      transform: (nominationInfo) => {
        if (nominationInfo == null) {
          return null;
        }

        return {
          ...nominationInfo,
          nominations: nominationInfo.nominations.reduce((prev, nomination) => {
            const groupKey = nomination.category ?? '';

            prev[groupKey] ??= [];
            prev[groupKey].push(nomination);

            return prev;
          }, {} as Record<string, INominationForPlanner[]>),
        };
      },
    },
  );

  if (nominationInfoError != null) {
    return (
      <div className='block-margin'>
        <span className='panic'>
          Failed to load nominations: {apiErrorMessage(nominationInfoError)}
        </span>
      </div>
    );
  }

  if (nominationInfo === undefined) {
    return <div className='block-margin'>Loading nominations...</div>;
  }

  if (nominationInfo == null) {
    return (
      <div className='warning-box'>
        Nominations for {gameModeLongName(gameMode)} are hidden until polls begin.
      </div>
    );
  }

  if (Object.keys(nominationInfo.nominations).length === 0) {
    return (
      <div className='block-margin'>
        <b>No nominations to show!</b>
      </div>
    );
  }

  const onNominationDelete = (nominationId: number) => {
    setNominationInfo((prev) => ({
      ...prev!,
      nominations: Object.fromEntries(
        Object.entries(prev!.nominations).map(([category, nominations]) => [
          category,
          nominations.filter((nomination) => nomination.id !== nominationId),
        ]),
      ),
    }));
  };

  return (
    <>
      {Object.keys(nominationInfo.nominations)
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b))
        .map((category) => (
          <Fragment key={category}>
            <h2>{category}</h2>
            {nominationInfo.nominations[category].map((nomination) => (
              <Nomination
                key={nomination.id}
                nomination={nomination}
                onNominationDelete={onNominationDelete}
                submissionUsersById={nominationInfo.submissionUsersById}
              />
            ))}
          </Fragment>
        ))}
      {nominationInfo.nominations[''] != null && (
        <>
          <h2>Uncategorized</h2>
          {nominationInfo.nominations[''].map((nomination) => (
            <Nomination
              key={nomination.id}
              nomination={nomination}
              onNominationDelete={onNominationDelete}
              submissionUsersById={nominationInfo.submissionUsersById}
            />
          ))}
        </>
      )}
    </>
  );
}
