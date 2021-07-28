import { apiErrorMessage, getMapperConsents, useApi } from '../api';
import { BeatmapInline } from '../BeatmapInline';
import { IMapperBeatmapsetConsent, IMapperConsent } from '../interfaces';
import { UserInline } from '../UserInline';


interface IMapperConsentGrouped extends Omit<IMapperConsent, 'beatmapset_consent'> {
  beatmapset_consents: IMapperBeatmapsetConsent[]
}

function consentToCell(consent?: 0 | 1 | 2 | boolean) {
  let index: 'null' | 0 | 1 | 2;
  if (consent === true) {
    index = 1
  } else if (consent === false) {
    index = 0
  } else {
    index = consent == null ? 'null' : consent;
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

function maybeBeatmapsetTable(consent: IMapperConsentGrouped) {
  if (consent.beatmapset_consents.length === 0) {
    return
  }
  return (
    <tr key={consent.id + "-dropdown"}>
      <td colSpan={3}>{MapperBeatmapsetConsents(consent)}</td>
    </tr>
  )
}

function MapperBeatmapsetConsents(mapperConsent: IMapperConsentGrouped) {
  return (
    <table style={{'width': '80%', 'marginLeft': '3em', 'marginRight': '3em', 'tableLayout': 'fixed'}}>
      <tr>
          <th style={{'width': '20%'}}>Beatmap</th>
          <th style={{'width': '20%'}}>Consent</th>
          <th style={{'width': '60%'}}>Notes</th>
      </tr>
      {mapperConsent.beatmapset_consents.map((consent) => {
        return (
          <>
            <tr key={mapperConsent.id + "-beatmapset-" + consent.beatmapset_id}>
              {/* <td><BeatmapInline beatmapset={consent.beatmapset_id} /></td> */}
              <td>{consent.beatmapset_id}</td>
              {consentToCell(consent.consent)}
              <td>{consent.consent_reason}</td>
            </tr>
          </>
        )
      })}
    </table>
  )
}

export default function MapperConsents() {
  const [consents, consentError] = useApi(getMapperConsents);

  if (consentError != null)
    return <span className='panic'>Failed to load mapper consents: {apiErrorMessage(consentError)}</span>;

  if (consents == null)
    return <span>Loading mapper consents...</span>;

  let mappedConsents: Record<number, IMapperConsentGrouped> = {}

  consents.forEach((consent) => {
    if (consent.id in mappedConsents) {
      mappedConsents[consent.id].beatmapset_consents.push(consent.beatmapset_consent);
    } else {
      let newConsent: any = {...consent}
      newConsent.beatmapset_consents = consent.beatmapset_consent == null ? [] : [consent.beatmapset_consent]
      delete newConsent.beatmapset_consent
      mappedConsents[consent.id] = newConsent
    }
  })

  const groupedConsents = Object.values(mappedConsents)
  groupedConsents.sort((c1, c2) => c1.mapper.name.localeCompare(c2.mapper.name))

  return (
    <div className='content-block'>
      <h1>Mapper Consents</h1>
      <table>
        <tr className='sticky'>
            <th>Mapper</th>
            <th>Consent</th>
            <th>Notes</th>
        </tr>
        {groupedConsents.map((consent) => {
          return (
            <>
              <tr key={consent.id}>
                <td><UserInline user={consent.mapper} /></td>
                {consentToCell(consent.consent)}
                <td>{consent.consent_reason}</td>
              </tr>
              {maybeBeatmapsetTable(consent)}
            </>
          )
        })}
      </table>
    </div>
  );
}
