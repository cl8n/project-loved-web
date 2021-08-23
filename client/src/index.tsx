import { StrictMode } from 'react';
import { render } from 'react-dom';
import { FormattedMessage } from 'react-intl';
import { BrowserRouter, Redirect, Route, Switch } from 'react-router-dom';
import { registerTextareaAutoHeightTrigger } from './auto-height';
import ForumOptIn from './forum-opt-in';
import { Header } from './Header';
import { IntlProviderWrapper } from './intl';
import { Manage } from './Manage';
import MapperConsents from './mapper-consents';
import { NoRoute } from './NoRoute';
import { OsuAuthProvider } from './osuAuth';
import { Picks } from './Picks';
import { PicksRoundListing } from './PicksRoundListing';
import { ProtectedRoute } from './ProtectedRoute';
import Statistics from "./statistics";
import './styles/main.scss';
import SubmissionForm from './submission-form';
import SubmissionListingContainer from './submission-listing';
import Team from './team';

registerTextareaAutoHeightTrigger();

render(
  <StrictMode>
    <BrowserRouter>
      <OsuAuthProvider>
        <IntlProviderWrapper>
          <Header />
          <main className='big-center'>
            <Switch>
              <Redirect exact from='/' to='/submissions/osu' />
              <Route path='/submissions/:gameMode'><SubmissionListingContainer /></Route>
              <Route path='/submit'><SubmissionForm /></Route>
              <Route path='/mappers'><MapperConsents /></Route>
              <Route path='/team'><Team /></Route>
              <Redirect from='/captains' to='/team' />
              <Route path='/statistics'><Statistics /></Route>
              <ProtectedRoute exact path='/admin/picks' role='any'><PicksRoundListing /></ProtectedRoute>
              <ProtectedRoute path='/admin/picks/:round' role='any'><Picks /></ProtectedRoute>
              <ProtectedRoute path='/admin/manage' role='any'><Manage /></ProtectedRoute>
              <ProtectedRoute path='/admin/forum-opt-in' role='captain'><ForumOptIn /></ProtectedRoute>
              <Route path='*'><NoRoute /></Route>
            </Switch>
          </main>
          <footer>
            <FormattedMessage
              defaultMessage='Flag icons by {author1} and {author2}'
              description='Credit in site footer'
              values={{
                author1: <a href='http://famfamfam.com'>Mark James</a>,
                author2: <a href='https://clayton.cc'>Clayton</a>,
              }}
            />
            {' | '}
            <FormattedMessage
              defaultMessage='Other icons by {author}'
              description='Credit in site footer'
              values={{ author: <a href='https://icons8.com'>Icons8</a> }}
            />
            {' | '}
            <a href='https://github.com/cl8n/project-loved-web'>
              <FormattedMessage
                defaultMessage='Source code and issue tracker'
                description='Link to GitHub repository in site footer'
              />
            </a>
          </footer>
        </IntlProviderWrapper>
      </OsuAuthProvider>
    </BrowserRouter>
  </StrictMode>,
  document.getElementById('loved-app'),
);
