import type { PropsWithChildren } from 'react';
import { StrictMode } from 'react';
import { render } from 'react-dom';
import { FormattedMessage } from 'react-intl';
import { BrowserRouter, Redirect, Route, Switch } from 'react-router-dom';
import { registerTextareaAutoHeightTrigger } from './auto-height';
import BackToTopButton from './BackToTopButton';
import CurrentNewsPostNotice from './CurrentNewsPostNotice';
import { Header } from './Header';
import { IntlProviderWrapper } from './intl';
import Localization from './localization';
import Manage from './manage';
import MapperConsentsPage from './mapper-consents/MapperConsentsPage';
import MorePages from './MorePages';
import { NoRoute } from './NoRoute';
import { OsuAuthProvider } from './osuAuth';
import { Picks } from './Picks';
import { PicksRoundListing } from './PicksRoundListing';
import { ProtectedRoute } from './ProtectedRoute';
import Statistics from './statistics';
import './styles/main.scss';
import SubmissionForm from './submission-form';
import SubmissionListingContainer from './submission-listing';
import SurveyClosed from './survey/SurveyClosed';
import SurveyResults from './survey/SurveyResults';
import Team from './team';
import { ThemeProvider } from './theme';

registerTextareaAutoHeightTrigger();

function RootProviders({ children }: PropsWithChildren<unknown>) {
  return (
    <StrictMode>
      <BrowserRouter>
        <OsuAuthProvider>
          <IntlProviderWrapper>
            <ThemeProvider>{children}</ThemeProvider>
          </IntlProviderWrapper>
        </OsuAuthProvider>
      </BrowserRouter>
    </StrictMode>
  );
}

render(
  <RootProviders>
    <Header />
    <main className='big-center'>
      <Switch>
        <Redirect exact from='/' to='/submissions' />
        <Route exact path='/submissions/:gameMode(mania)/:keyMode(\d+K)'>
          <CurrentNewsPostNotice />
          <SubmissionListingContainer />
        </Route>
        <Route exact path='/submissions/:gameMode?'>
          <CurrentNewsPostNotice />
          <SubmissionListingContainer />
        </Route>
        <Redirect
          exact
          from='/submissions/:gameMode(mania)/:keyMode(\d+K)/:page(\d+)'
          to='/submissions/:gameMode/:keyMode'
        />
        <Redirect exact from='/submissions/:gameMode/:page(\d+)' to='/submissions/:gameMode' />
        <Route exact path='/submit'>
          <CurrentNewsPostNotice />
          <SubmissionForm />
        </Route>
        <Route exact path='/picks'>
          <PicksRoundListing />
        </Route>
        <Route exact path='/picks/:round(\d+)'>
          <Picks />
        </Route>
        <Redirect exact from='/admin/picks/:round(\d+)?' to='/picks/:round?' />
        <Route exact path='/mappers'>
          <MapperConsentsPage />
        </Route>
        <Route exact path='/contributors'>
          <Team />
        </Route>
        <Redirect exact from='/captains' to='/contributors' />
        <Redirect exact from='/team' to='/contributors' />
        <Route exact path='/statistics'>
          <Statistics />
        </Route>
        <Route exact path='/more'>
          <MorePages />
        </Route>
        <ProtectedRoute path='/manage' role='any'>
          <Manage />
        </ProtectedRoute>
        <Redirect exact from='/admin/forum-opt-in' to='/manage/forum-opt-in' />
        <Redirect exact from='/admin/manage/:page?' to='/manage/:page?' />
        <Redirect exact from='/admin/settings' to='/manage/settings' />
        <Route exact path='/localization/:locale?'>
          <Localization />
        </Route>
        <Route exact path='/survey/closed'>
          <SurveyClosed />
        </Route>
        <Route exact path='/survey/:survey'>
          <SurveyResults />
        </Route>
        <Route>
          <NoRoute />
        </Route>
      </Switch>
    </main>
    <footer>
      <FormattedMessage
        defaultMessage='Flag icons by {author}'
        description='[Footer] Credit in site footer'
        values={{ author: <a href='http://famfamfam.com'>Mark James</a> }}
      />
      {' | '}
      <FormattedMessage
        defaultMessage='Other icons by {author}'
        description='[Footer] Credit in site footer'
        values={{ author: <a href='https://icons8.com'>Icons8</a> }}
      />
      {' | '}
      <a href='https://github.com/cl8n/project-loved-web'>
        <FormattedMessage
          defaultMessage='Source code and issue tracker'
          description='[Footer] Link to GitHub repository in site footer'
        />
      </a>
    </footer>
    <BackToTopButton />
  </RootProviders>,
  document.getElementById('loved-app'),
);
