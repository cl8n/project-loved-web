import { Bar, BarChart, CartesianAxis, Tooltip, XAxis, YAxis } from 'recharts';

interface QuestionProps {
  question: {
    answers: { count: number; name: string }[];
    question: string;
    type: '1to5' | 'options';
  };
}

export default function Question({ question }: QuestionProps) {
  return (
    <div className='survey-question'>
      <div className='survey-question-info'>
        <h2>{question.question}</h2>
        <span>{4.5}</span>
      </div>
      <BarChart data={question.answers} width={700} height={175}>
        <CartesianAxis />
        <XAxis dataKey='name' />
        <YAxis />
        <Tooltip />
        <Bar dataKey='count' fill='#F76E9C' />
      </BarChart>
    </div>
  );
}
/*
<BarChart width={730} height={250} data={data}>
  <CartesianGrid strokeDasharray="3 3" />
  <XAxis dataKey="name" />
  <YAxis />
  <Tooltip />
  <Legend />
  <Bar dataKey="pv" fill="#8884d8" />
  <Bar dataKey="uv" fill="#82ca9d" />
</BarChart>
*/
