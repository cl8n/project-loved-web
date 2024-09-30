import './styles/main.scss';
import { Role } from 'loved-bridge/tables';
import type { ReactNode } from 'react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { FormattedMessage } from 'react-intl';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { registerTextareaAutoHeightTrigger } from './auto-height';
import BackToTopButton from './BackToTopButton';
import CurrentNewsPostNotice from './CurrentNewsPostNotice';
import { Header } from './Header';
import { IntlProviderWrapper } from './intl';
import Localization from './localization';
import Manage from './manage';
import ApiObjects from './manage/api-objects';
import Authorize from './manage/Authorize';
import ClientKeyPage from './manage/client-key/ClientKeyPage';
import ForumOptIn from './manage/forum-opt-in';
import Logs from './manage/logs';
import Roles from './manage/roles';
import Settings from './manage/settings';
import MapperConsentsPage from './mapper-consents/MapperConsentsPage';
import MorePages from './MorePages';
import NominationPlannerPage from './nomination-planner/NominationPlannerPage';
import { NoRoute } from './NoRoute';
import { NotReady } from './NotReady';
import OnlineUsers from './OnlineUsers';
import { OsuAuthProvider } from './osuAuth';
import { Picks } from './Picks';
import { PicksRoundListing } from './PicksRoundListing';
import Statistics from './statistics';
import SubmissionForm from './submission-form';
import SubmissionListingContainer from './submission-listing';
import SurveyClosed from './survey/SurveyClosed';
import SurveyResults from './survey/SurveyResults';
import Team from './team';
import { ThemeProvider } from './theme';

function Root() {
  return (
    <>
      <Header />
      <main className='big-center'>
        <RootRoutes />
      </main>
      <footer>
        <OnlineUsers />
        <div>
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
          <FormattedMessage
            defaultMessage='<link>Source code</link> (<commitLink>{commit}, {timestamp, date, short}</commitLink>)'
            description='[Footer] Link to GitHub repository'
            values={{
              commit: process.env.GIT_COMMIT?.slice(0, 7) || 'master',
              commitLink: (c: ReactNode) => (
                <a
                  href={`https://github.com/cl8n/project-loved-web/tree/${process.env.GIT_COMMIT || 'master'}`}
                >
                  {c}
                </a>
              ),
              link: (c: ReactNode) => <a href='https://github.com/cl8n/project-loved-web'>{c}</a>,
              timestamp: process.env.GIT_COMMIT_TIMESTAMP
                ? new Date(Number.parseInt(process.env.GIT_COMMIT_TIMESTAMP))
                : new Date(),
            }}
          />
          {' | '}
          <a href='https://github.com/cl8n/project-loved-web/issues'>
            <FormattedMessage
              defaultMessage='Issue tracker'
              description='[Footer] Link to GitHub issues'
            />
          </a>
        </div>
      </footer>
      <BackToTopButton />
    </>
  );
}

function RootRoutes() {
  return (
    <Routes>
      {/* Redirect root to submission listing, for now */}
      <Route path='' element={<Navigate replace to='submissions' />} />

      {/* Pages */}
      <Route
        element={
          <>
            <CurrentNewsPostNotice />
            <Outlet />
          </>
        }
      >
        <Route element={<SubmissionListingContainer />}>
          <Route path='submissions/:gameMode?' />
          <Route path='submissions/mania/:keyMode' />
        </Route>
        <Route path='submit' element={<SubmissionForm />} />
      </Route>
      <Route path='picks'>
        <Route index element={<PicksRoundListing />} />
        <Route
          path='planner/:gameMode?'
          element={
            <NotReady>
              <NominationPlannerPage />
            </NotReady>
          }
        />
        <Route path=':round' element={<Picks />} />
      </Route>
      <Route path='mappers' element={<MapperConsentsPage />} />
      <Route path='contributors' element={<Team />} />
      <Route path='statistics' element={<Statistics />} />
      <Route path='more' element={<MorePages />} />
      <Route
        path='manage'
        element={
          <Authorize role='any'>
            <Manage />
          </Authorize>
        }
      >
        <Route path='roles' element={<Roles />} />
        <Route path='api-objects' element={<ApiObjects />} />
        <Route path='logs' element={<Logs />} />
        <Route
          path='forum-opt-in'
          element={
            <Authorize role={[Role.captain, Role.newsAuthor]}>
              <ForumOptIn />
            </Authorize>
          }
        />
        <Route
          path='settings'
          element={
            <Authorize role={Role.captain}>
              <Settings />
            </Authorize>
          }
        />
        <Route
          path='client-key'
          element={
            <Authorize role={Role.newsAuthor}>
              <ClientKeyPage />
            </Authorize>
          }
        />
      </Route>
      <Route path='localization/:locale?' element={<Localization />} />
      <Route path='survey'>
        <Route path='closed' element={<SurveyClosed />} />
        <Route path=':survey' element={<SurveyResults />} />
      </Route>

      {/* Fallback */}
      <Route path='*' element={<NoRoute />} />
    </Routes>
  );
}

registerTextareaAutoHeightTrigger();

createRoot(document.getElementById('loved-app')!).render(
  <StrictMode>
    <BrowserRouter>
      <OsuAuthProvider>
        <IntlProviderWrapper>
          <ThemeProvider>
            <Root />
          </ThemeProvider>
        </IntlProviderWrapper>
      </OsuAuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
