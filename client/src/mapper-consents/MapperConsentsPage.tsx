import { FormattedMessage } from 'react-intl';
import useTitle from '../useTitle';
import MapperConsents from './MapperConsents';

export default function MapperConsentsPage() {
  useTitle('Mapper consents');

  return (
    <>
      <FormattedMessage
        defaultMessage='Mapper consents'
        description='Mapper consents page title'
        tagName='h1'
      />
      <FormattedMessage
        defaultMessage="Mappers are usually made aware of their maps' usage in the Loved category. This table shows each mapper's consent to let Project Loved put their maps up for voting and potentially add leaderboards to them. Note that mappers may request their maps' removal from Loved at any time, even if their usage was consented to at an earlier time."
        description='Mapper consents description'
        tagName='p'
      />
      <MapperConsents />
    </>
  );
}
