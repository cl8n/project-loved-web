import type { GameMode } from 'loved-bridge/beatmaps/gameMode';
import { gameModeLongName, gameModes } from 'loved-bridge/beatmaps/gameMode';
import type { ChangeEvent } from 'react';
import { useState } from 'react';
import { defineMessages, FormattedMessage, useIntl } from 'react-intl';
import { useParams } from 'react-router-dom';
import useTitle from '../useTitle';
import type { ComparingStatistic, UserIdentity } from './helpers';
import Questions from './Questions';

const messages = defineMessages({
  all: {
    defaultMessage: 'All',
    description: '[Poll results] Game mode option for poll results table',
  },
  gameMode: {
    defaultMessage: 'Game mode:',
    description: '[General] Selector to change game mode',
  },
});

export default function SurveyResults() {
  useTitle('Survey results');
  const intl = useIntl();
  const { survey } = useParams<{ survey: string }>();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [comparingStat, setComparingStat] = useState<ComparingStatistic>();
  const [gameMode, setGameMode] = useState<GameMode>();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [userIdentity, setUserIdentity] = useState<UserIdentity>();

  const onGameModeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.currentTarget.value;

    setGameMode(value === 'all' ? undefined : parseInt(value));
  };

  return (
    <>
      <div className='content-block'>
        <FormattedMessage
          defaultMessage='Survey results'
          description='[Surveys] Title of survey results page'
          tagName='h1'
        />
        <div className='flex-left'>
          <label htmlFor='gameMode'>{intl.formatMessage(messages.gameMode)}</label>
          <select name='gameMode' value={gameMode ?? 'all'} onChange={onGameModeChange}>
            <option value='all'>{intl.formatMessage(messages.all)}</option>
            {gameModes.map((m) => (
              <option key={m} value={m}>
                {gameModeLongName(m)}
              </option>
            ))}
          </select>
        </div>
      </div>
      <Questions
        comparingStat={comparingStat}
        gameMode={gameMode}
        survey={survey}
        userIdentity={userIdentity}
      />
    </>
  );
}
