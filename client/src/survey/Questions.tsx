import type { GameMode } from 'loved-bridge/beatmaps/gameMode';
import { Fragment, useEffect, useMemo, useState } from 'react';
import type { ComparingStatistic, SurveyData, UserIdentity } from './helpers';
import { loadSurveyData } from './helpers';
import Question from './Question';

interface QuestionsProps {
  comparingStat: ComparingStatistic | undefined;
  gameMode: GameMode | undefined;
  survey: string;
  userIdentity: UserIdentity | undefined;
}

export default function Questions({
  comparingStat,
  gameMode,
  survey,
  userIdentity,
}: QuestionsProps) {
  const [surveyData, setSurveyData] = useState<SurveyData | null>();
  const questions = useMemo(() => {
    if (surveyData == null) {
      return null;
    }

    let responses = surveyData.responses;

    if (gameMode != null) {
      responses = responses.filter((response) => response.user.gameMode === gameMode);
    }

    if (userIdentity != null) {
      responses = responses.filter((response) => response.user.identity?.includes(userIdentity));
    }

    return surveyData.questions.map((questionData, index) => {
      const answers: Record<string, number> =
        questionData.type === '1to5' ? { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } : {};

      for (const response of responses) {
        const answer = response.answers[index];

        if (answer != null) {
          answers[answer] ??= 0;
          answers[answer]++;
        }
      }

      return {
        ...questionData,
        answers: Object.entries(answers).map(([name, count]) => ({ count, name })),
      };
    });
  }, [gameMode, surveyData, userIdentity]);

  useEffect(() => {
    loadSurveyData(survey)
      .then(setSurveyData)
      .catch(() => setSurveyData(null));
  }, [survey]);

  // eslint-disable-next-line eqeqeq
  if (surveyData === null) {
    return (
      <div className='content-block'>
        <span className='panic'>Survey not found</span>
      </div>
    );
  }

  if (questions == null || surveyData == null) {
    return (
      <div className='content-block'>
        <span>Loading survey...</span>
      </div>
    );
  }

  return (
    <div className='content-block'>
      <h1>{surveyData.title}</h1>
      {questions.map(
        (question, index) =>
          question.type !== 'open-ended' && <Question key={index} question={question as any} />,
      )}
      {questions.map(
        (question, index) =>
          question.type === 'open-ended' && (
            <Fragment key={index}>
              <h2>{question.question}</h2>
              {question.answers.map((answer, index) => (
                <p key={index}>{answer.name}</p>
              ))}
            </Fragment>
          ),
      )}
    </div>
  );
}
