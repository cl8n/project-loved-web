import { apiErrorMessage, getMapperConsents, useApi } from '../api';
import { UserInline } from '../UserInline';

function consentToCell(consent?: 0 | 1 | 2) {
  let index: 'null' | 0 | 1 | 2;
  if (consent == null) {
    index = 'null';
  } else {
    index = consent;
  }
  const mapping = {
    'null': ['no reply', 'pending'],
    0: ['no', 'error'],
    1: ['yes', 'success'],
    2: ['unreachable', 'pending']
  };
  const [consentStr, className] = mapping[index];

  return (
    <td className={className}>
      {consentStr}
    </td>
  )
}


export default function MapperConsents() {
  const [consents, consentError] = useApi(getMapperConsents);

  if (consentError != null)
    return <span className='panic'>Failed to load mapper consents: {apiErrorMessage(consentError)}</span>;

  if (consents == null)
    return <span>Loading mapper consents...</span>;

  consents.map((consent) => (
    console.log(consent.mapper.name)
  ));

  return (
    <div className='content-block'>
      <h1>Mapper Consents</h1>
      <table>
        <tr className='sticky'>
            <th>Mapper</th>
            <th>Consent</th>
            <th>Notes</th>
        </tr>
        {consents.map((consent) => (
          <tr key={consent.id}>
            <td><UserInline user={consent.mapper} /></td>
            {consentToCell(consent.consent)}
            <td>{consent.consent_reason}</td>
          </tr>
        ))}
      </table>
    </div>
  );
}
