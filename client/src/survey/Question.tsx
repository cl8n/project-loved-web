import interpolateColor from 'color-interpolate';
import { useIntl } from 'react-intl';
import { Bar, BarChart, XAxis } from 'recharts';
import { useColors } from '../theme';

interface QuestionProps {
  answers: { count: number; name: string }[];
  average: number | undefined;
  question: string;
}

export default function Question({ answers, average, question }: QuestionProps) {
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
      <BarChart data={answers} width={700} height={175}>
        <XAxis
          dataKey='name'
          stroke={colors.content}
          tick={<XAxisTick />}
          tickLine={{ stroke: colors.content }}
        />
        <Bar dataKey='count' fill={colors.accent} label={{ fill: colors.background }} />
      </BarChart>
    </div>
  );
}

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
      fill={(answerColors as any)[payload.value] ?? colors.content}
      textAnchor='middle'
    >
      {payload.value}
    </text>
  );
}
