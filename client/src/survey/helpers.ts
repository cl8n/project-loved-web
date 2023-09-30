import type { GameMode } from 'loved-bridge/beatmaps/gameMode';

export const comparingStatistics = ['rank', 'joinYear'] as const;
export const userIdentities = ['player', 'mapper'] as const;

export type ComparingStatistic = (typeof comparingStatistics)[number];
export type QuestionType = '1to5' | 'open-ended' | 'options';
export type UserIdentity = (typeof userIdentities)[number];

export interface SurveyData {
  questions: {
    question: string;
    type: QuestionType;
  }[];
  responses: {
    answers: (string | null)[];
    user: {
      gameMode: GameMode;
      identity?: UserIdentity[] | null;
      joinYear: number;
      rank?: number | null;
    };
  }[];
  title: string;
}

export function loadSurveyData(survey: string): Promise<SurveyData> {
  return import(
    /* webpackChunkName: "survey-data" */
    /* webpackMode: "lazy-once" */
    `./data/${survey}.json`
  ).then(({ default: surveyDataExport }) => surveyDataExport);
}
