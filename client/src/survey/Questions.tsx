import type { GameMode } from 'loved-bridge/beatmaps/gameMode';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { UserInline } from '../UserInline';
import type { ComparingStatistic, SurveyData, UserIdentity } from './helpers';
import { loadSurveyData } from './helpers';
import type { QuestionProps } from './Question';
import Question from './Question';

function arrayAverage(array: number[]): number | undefined {
  return array.length === 0
    ? undefined
    : array.reduce((sum, value) => sum + value, 0) / array.length;
}

interface QuestionsProps {
  comparingStatistic: ComparingStatistic | undefined;
  gameMode: GameMode | undefined;
  survey: string;
  userIdentity: UserIdentity | undefined;
}

export default function Questions({
  comparingStatistic,
  gameMode,
  survey,
  userIdentity,
}: QuestionsProps) {
  const [surveyData, setSurveyData] = useState<SurveyData | null>();
  const questions: QuestionProps[] | null = useMemo(() => {
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
      if (questionData.type === 'open-ended') {
        return {
          answers: responses.map((response) => response.answers[index]).filter(Boolean) as string[],
          question: questionData.question,
          type: questionData.type,
        };
      }

      // TODO: Typing is very difficult here
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let answers: any;
      let average: number | undefined;

      if (questionData.type === '1to5') {
        average = arrayAverage(
          responses
            .map((response) => parseInt(response.answers[index] ?? '', 10))
            .filter((answer) => !isNaN(answer)),
        );

        if (comparingStatistic != null) {
          const bucketedAnswers: Record<number, number[]> = {};

          for (const response of responses) {
            const answer = parseInt(response.answers[index] ?? '', 10);
            const statistic = response.user[comparingStatistic];

            if (isNaN(answer) || statistic == null) {
              continue;
            }

            bucketedAnswers[statistic] ??= [];
            bucketedAnswers[statistic].push(answer);
          }

          answers = Object.entries(bucketedAnswers).map(([statistic, answers]) => ({
            average: arrayAverage(answers)!,
            statistic: parseInt(statistic, 10),
          }));
        }
      }

      if (answers == null) {
        const answerCounts: Record<string, number> =
          questionData.type === '1to5' ? { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } : {};

        for (const response of responses) {
          const answer = response.answers[index];

          if (answer != null) {
            answerCounts[answer] ??= 0;
            answerCounts[answer]++;
          }
        }

        answers = Object.entries(answerCounts).map(([name, count]) => ({ count, name }));
      }

      return questionData.type === '1to5'
        ? {
            answers,
            average,
            comparingStatistic,
            question: questionData.question,
            type: questionData.type,
          }
        : {
            answers,
            question: questionData.question,
            type: questionData.type,
          };
    });
  }, [comparingStatistic, gameMode, surveyData, userIdentity]);

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
          question.type !== 'open-ended' && <Question key={index} {...question} />,
      )}
      {questions.map(
        (question, index) =>
          question.type === 'open-ended' && (
            <Fragment key={index}>
              <h2>{question.question}</h2>
              <div className='warning-box'>
                The responses here are unedited, but I removed some that didn't provide any feedback
                about the project. Lots of them were nice "thank you"s, so thank you too everybody!
                If you notice your comment was removed and you think it shouldn't have been, let me
                know. —{' '}
                <UserInline
                  user={{
                    avatar_url: '',
                    banned: false,
                    country: 'US',
                    id: 3666350,
                    name: 'clayton',
                  }}
                />
              </div>
              {question.answers.map((answer, index) => (
                <div key={index} className='survey-question-open-ended'>
                  <span>“</span>
                  <p>{answer}</p>
                  <span>”</span>
                </div>
              ))}
            </Fragment>
          ),
      )}
    </div>
  );
}
