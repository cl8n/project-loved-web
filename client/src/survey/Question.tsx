import interpolateColor from 'color-interpolate';
import { useIntl } from 'react-intl';
import type { XAxisProps } from 'recharts';
import { Area, AreaChart, Bar, BarChart, XAxis, YAxis } from 'recharts';
import { useColors } from '../theme';
import type { ComparingStatistic } from './helpers';

interface BaseQuestion {
  question: string;
}

interface ComparingQuestion extends BaseQuestion {
  answers: { average: number; statistic: number }[];
  average: number | undefined;
  comparingStatistic: ComparingStatistic;
  type: '1to5';
}

interface NormalQuestion extends BaseQuestion {
  answers: { count: number; name: string }[];
  average?: number | undefined;
  comparingStatistic?: undefined;
  type: '1to5' | 'options';
}

interface OpenEndedQuestion extends BaseQuestion {
  answers: string[];
  type: 'open-ended';
}

export type QuestionProps = ComparingQuestion | NormalQuestion | OpenEndedQuestion;

export default function Question({
  answers,
  average,
  comparingStatistic,
  question,
  type,
}: ComparingQuestion | NormalQuestion) {
  const intl = useIntl();
  const colors = useColors();

  return (
    <div className='survey-question'>
      <div className='survey-question-info'>
        <h2>{question}</h2>
        {average != null && (
          <span
            style={{
              color: interpolateColor([
                colors['rating--2'],
                colors['rating--1'],
                colors['rating-0'],
                colors['rating-1'],
                colors['rating-2'],
              ])((average - 1) / 4),
            }}
          >
            {intl.formatNumber(average)}
          </span>
        )}
      </div>
      {type === '1to5' && comparingStatistic != null ? (
        <ComparingChart answers={answers} comparingStatistic={comparingStatistic} />
      ) : (
        <BarChart data={answers} width={700} height={175}>
          <XAxis
            dataKey='name'
            stroke={colors.content}
            tick={<XAxisTick />}
            tickLine={{ stroke: colors.content }}
          />
          <Bar dataKey='count' fill={colors.accent} label={{ fill: colors.background }} />
        </BarChart>
      )}
    </div>
  );
}

interface ComparingChartProps {
  answers: { average: number; statistic: number }[];
  comparingStatistic: ComparingStatistic;
}

function ComparingChart({ answers, comparingStatistic }: ComparingChartProps) {
  const intl = useIntl();
  const colors = useColors();

  const xAxisProps: XAxisProps = {
    dataKey: 'statistic',
    interval: 'preserveStartEnd',
    stroke: colors.content,
    tick: { fill: colors.content },
    tickLine: { stroke: colors.content },
  };

  if (comparingStatistic === 'rank') {
    xAxisProps.domain = ['dataMin', 'dataMax'];
    xAxisProps.scale = 'log';
    xAxisProps.tickFormatter = (value) => intl.formatNumber(value);
    xAxisProps.type = 'number';
  }

  return (
    <AreaChart data={answers} width={700} height={175}>
      <defs>
        <linearGradient id='answerColor' x1='0' y1='0' x2='0' y2='1'>
          <stop offset='0%' stopColor={colors['rating-2']} stopOpacity={0.9} />
          <stop offset='20%' stopColor={colors['rating-1']} stopOpacity={0.8} />
          <stop offset='40%' stopColor={colors['rating-0']} stopOpacity={0.7} />
          <stop offset='60%' stopColor={colors['rating--1']} stopOpacity={0.6} />
          <stop offset='80%' stopColor={colors['rating--2']} stopOpacity={0.5} />
          <stop offset='100%' stopColor={colors['rating--2']} stopOpacity={0} />
        </linearGradient>
      </defs>
      <XAxis {...xAxisProps} />
      <YAxis dataKey='average' domain={[0, 5]} hide />
      <Area
        type='monotone'
        dataKey='average'
        stroke={colors.content}
        fillOpacity={1}
        fill='url(#answerColor)'
      />
    </AreaChart>
  );
}

// TODO no idea how to type this
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function XAxisTick({ x, y, payload }: any) {
  const colors = useColors();

  const answerColors = {
    1: colors['rating--2'],
    2: colors['rating--1'],
    3: colors['rating-0'],
    4: colors['rating-1'],
    5: colors['rating-2'],
    True: colors['rating-2'],
    False: colors['rating--2'],
  };

  return (
    <text
      x={x}
      y={y}
      dy={12}
      fill={answerColors[payload.value as keyof typeof answerColors] ?? colors.content}
      textAnchor='middle'
    >
      {payload.value}
    </text>
  );
}
