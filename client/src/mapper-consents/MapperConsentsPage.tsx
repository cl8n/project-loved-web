import { FormattedMessage } from 'react-intl';
import { useParams } from 'react-router-dom';
import useTitle from '../useTitle';
import MapperConsents from './MapperConsents';

type MapperConsentPageParams = 
  | { page: `${number}`} | undefined;

export default function MapperConsentsPage() {
  useTitle('Mapper consents');

  const params = useParams<MapperConsentPageParams>();

  return (
    <>
      <FormattedMessage
        defaultMessage='Mapper consents'
        description='[Mapper consents] Mapper consents page title'
        tagName='h1'
      />
      <FormattedMessage
        defaultMessage="Mappers are usually made aware of their maps' usage in the Loved category. This table shows each mapper's consent to let Project Loved put their maps up for voting and potentially add leaderboards to them. Note that mappers may request their maps' removal from Loved at any time, even if their usage was consented to at an earlier time."
        description='[Mapper consents] Mapper consents description'
        tagName='p'
      />
      <MapperConsents
        page={params?.page == null ? 1 : parseInt(params.page)}
       />
    </>
  );
}
