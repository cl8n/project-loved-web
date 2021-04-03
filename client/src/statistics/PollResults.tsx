import { apiErrorMessage, getPollResults, useApi } from '../api';
import {GameMode} from "../interfaces";
import {ChangeEvent, useState} from "react";
import {gameModeLongName} from "../osu-helpers";
import {BeatmapInline} from "../BeatmapInline";

export default function PollResults() {
  const [gameMode, setGameMode] = useState<GameMode>();
  const [polls, pollsError] = useApi(getPollResults);
  const [showPercent, setShowPercent] = useState(true);

  if (pollsError != null)
    return <span className='panic'>Failed to load poll results: {apiErrorMessage(pollsError)}</span>;

  if (polls == null)
    return <span>Loading poll results...</span>;

  const displayPolls = gameMode == null
    ? polls
    : polls.filter((poll) => poll.game_mode === gameMode);

  const formatResults = showPercent
    ? (yes: number, no: number) => {
      const total = yes + no;
      const percent = yes / total * 100;

      return `${percent.toFixed(2)}% — ${total} Total`;
    }
    : (yes: number, no: number) => `${yes} Yes — ${no} No`;

  const onGameModeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.currentTarget.value;

    setGameMode(value === 'none' ? undefined : parseInt(value));
  };

  return (
    <>
      <div className='flex-left'>
        <label htmlFor='gameMode'>Game mode filter:</label>
        <select
          name='gameMode'
          value={gameMode}
          onChange={onGameModeChange}
        >
          <option value='none'>None</option>
          {[0, 1, 2, 3].map((m) => (
            <option value={m}>{gameModeLongName(m)}</option>
          ))}
        </select>
        <button
          type='button'
          className='fake-a'
          onClick={() => setShowPercent((prev) => !prev)}
        >
          {showPercent
            ? 'Display results as "Yes" and "No"'
            : 'Display results as "Percent" and "Total"'
          }
        </button>
      </div>
      <table style={{ marginTop: '1em' }}>
        <tr>
          <th className='no-wrap'>Round</th>
          {gameMode == null &&
            <th className='no-wrap'>Game mode</th>
          }
          <th>Beatmapset</th>
          <th className='no-wrap'>Poll topic</th>
          <th>Result</th>
        </tr>
        {displayPolls.map((poll) => (
          <tr key={poll.id}>
            <td>{poll.round}</td>
            {gameMode == null &&
              <td>{gameModeLongName(poll.game_mode)}</td>
            }
            <td><BeatmapInline beatmapset={poll.beatmapset} gameMode={poll.game_mode} showCreator /></td>
            <td><a href={`https://osu.ppy.sh/community/forums/topics/${poll.topic_id}`}>{poll.topic_id}</a></td>
            <td className='no-wrap'>{formatResults(poll.result_yes, poll.result_no)}</td>
          </tr>
        ))}
      </table>
    </>
  );
}
