import type { GameMode } from 'loved-bridge/beatmaps/gameMode';
import { gameModeLongName, gameModes } from 'loved-bridge/beatmaps/gameMode';
import { useMemo, useState } from 'react';
import { defineMessages, FormattedMessage, useIntl } from 'react-intl';
import { apiErrorMessage, getPolls, useApi } from '../api';
import { BeatmapInline } from '../BeatmapInline';
import type { IPoll } from '../interfaces';

const messages = defineMessages({
  any: {
    defaultMessage: 'Any',
    description: '[General] Selector option indicating that any of the choices are valid',
  },
  ascending: {
    defaultMessage: 'Ascending',
    description: '[Poll results] Round order option for poll results table',
  },
  descending: {
    defaultMessage: 'Descending',
    description: '[Poll results] Round order option for poll results table',
  },
  percentAndTotal: {
    defaultMessage: 'Percent and total',
    description: '[Poll results] Result display option for poll results table',
  },
  resultDisplay: {
    defaultMessage: 'Result display:',
    description: '[Poll results] Selector to change result display in poll results table',
  },
  roundOrder: {
    defaultMessage: 'Round order:',
    description: '[Poll results] Selector to change round order in poll results table',
  },
  yesAndNo: {
    defaultMessage: 'Yes and no',
    description: '[Poll results] Result display option for poll results table',
  },
  pollInProgress: {
    defaultMessage: 'Poll in progress',
    description: '[Poll results] Placeholder for results for ongoing polls',
  },

  deletedBeatmapset: {
    defaultMessage: 'Deleted beatmapset',
    description: '[General] Placeholder for beatmapsets that were deleted from osu!',
  },
  gameMode: {
    defaultMessage: 'Game mode:',
    description: '[General] Selector to change game mode',
  },
});

export default function Polls() {
  const intl = useIntl();
  const [gameMode, setGameMode] = useState<GameMode>();
  const [polls, pollsError] = useApi(getPolls);
  const [roundOrderAsc, setRoundOrderAsc] = useState(false);
  const [showPercent, setShowPercent] = useState(true);
  const displayPolls = useMemo(() => {
    if (polls == null) {
      return undefined;
    }

    let displayPolls = [...polls];

    if (gameMode != null) {
      displayPolls = displayPolls.filter((poll) => poll.game_mode === gameMode);
    }

    if (roundOrderAsc) {
      displayPolls.sort((a, b) => a.round_id - b.round_id);
    }

    return displayPolls;
  }, [gameMode, polls, roundOrderAsc]);

  if (pollsError != null) {
    return (
      <span className='panic'>Failed to load poll results: {apiErrorMessage(pollsError)}</span>
    );
  }

  if (displayPolls == null) {
    return <span>Loading poll results...</span>;
  }

  return (
    <>
      <div className='flex-left'>
        <label htmlFor='gameMode'>{intl.formatMessage(messages.gameMode)}</label>
        <select
          name='gameMode'
          value={gameMode}
          onChange={(event) =>
            setGameMode(
              event.currentTarget.value ? parseInt(event.currentTarget.value, 10) : undefined,
            )
          }
        >
          <option value=''>{intl.formatMessage(messages.any)}</option>
          {gameModes.map((m) => (
            <option key={m} value={m}>
              {gameModeLongName(m)}
            </option>
          ))}
        </select>
        <label htmlFor='roundOrder'>{intl.formatMessage(messages.roundOrder)}</label>
        <select
          name='roundOrder'
          value={roundOrderAsc ? '1' : '0'}
          onChange={(event) => setRoundOrderAsc(event.currentTarget.value === '1')}
        >
          <option value='0'>{intl.formatMessage(messages.descending)}</option>
          <option value='1'>{intl.formatMessage(messages.ascending)}</option>
        </select>
        <label htmlFor='resultDisplay'>{intl.formatMessage(messages.resultDisplay)}</label>
        <select
          name='resultDisplay'
          value={showPercent ? '0' : '1'}
          onChange={(event) => setShowPercent(event.currentTarget.value === '0')}
        >
          <option value='0'>{intl.formatMessage(messages.percentAndTotal)}</option>
          <option value='1'>{intl.formatMessage(messages.yesAndNo)}</option>
        </select>
      </div>
      <table className='main-table'>
        <thead>
          <tr className='sticky'>
            <FormattedMessage
              defaultMessage='Round'
              description='[Poll results] Poll results table header'
              tagName='th'
            />
            {gameMode == null && (
              <FormattedMessage
                defaultMessage='Game mode'
                description='[Poll results] Poll results table header'
                tagName='th'
              />
            )}
            <FormattedMessage
              defaultMessage='Beatmapset'
              description='[Poll results] Poll results table header'
              tagName='th'
            />
            {showPercent ? (
              <>
                <FormattedMessage
                  defaultMessage='Percent'
                  description='[Poll results] Poll results table header'
                  tagName='th'
                />
                <FormattedMessage
                  defaultMessage='Total'
                  description='[Poll results] Poll results table header'
                  tagName='th'
                />
              </>
            ) : (
              <>
                <FormattedMessage
                  defaultMessage='Yes'
                  description='[Poll results] Poll results table header'
                  tagName='th'
                />
                <FormattedMessage
                  defaultMessage='No'
                  description='[Poll results] Poll results table header'
                  tagName='th'
                />
              </>
            )}
            <FormattedMessage
              defaultMessage='Poll topic'
              description='[Poll results] Poll results table header'
              tagName='th'
            />
          </tr>
        </thead>
        <tbody>
          {displayPolls.map((poll) => (
            <tr key={poll.id}>
              <td>{intl.formatNumber(poll.round_id)}</td>
              {gameMode == null && <td>{gameModeLongName(poll.game_mode)}</td>}
              <td className='normal-wrap'>
                {poll.beatmapset == null ? (
                  <i>{intl.formatMessage(messages.deletedBeatmapset)}</i>
                ) : (
                  <BeatmapInline
                    beatmapset={poll.beatmapset}
                    gameMode={poll.game_mode}
                    showCreator
                  />
                )}
              </td>
              <ResultCells poll={poll} showPercent={showPercent} />
              <td>
                <a href={`https://osu.ppy.sh/community/forums/topics/${poll.topic_id}`}>
                  #{poll.topic_id}
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

interface ResultCellsProps {
  poll: IPoll;
  showPercent: boolean;
}

function ResultCells({ poll, showPercent }: ResultCellsProps) {
  const intl = useIntl();

  const yes = poll.result_yes;
  const no = poll.result_no;

  if (no == null || yes == null) {
    return (
      <td colSpan={2}>
        <i>{intl.formatMessage(messages.pollInProgress)}</i>
      </td>
    );
  }

  const total = yes + no;
  const yesFraction = yes / total;

  const className =
    poll.voting_threshold == null
      ? undefined
      : yesFraction >= poll.voting_threshold
      ? 'success'
      : 'error';

  return showPercent ? (
    <>
      <td className={className}>
        {intl.formatNumber(yesFraction, { minimumFractionDigits: 2, style: 'percent' })}
      </td>
      <td>{intl.formatNumber(total)}</td>
    </>
  ) : (
    <>
      <td className={className}>{intl.formatNumber(yes)}</td>
      <td>{intl.formatNumber(no)}</td>
    </>
  );
}
