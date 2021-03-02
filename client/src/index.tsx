import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter, Route, Switch } from 'react-router-dom';
import { Header } from './Header';
import { Manage } from './Manage';
import { NotReady } from './NotReady';
import { OsuAuthProvider } from './osuAuth';
import { PicksRoundListing } from './PicksRoundListing';
import { ProtectedRoute } from './ProtectedRoute';
import reportWebVitals from './reportWebVitals';
import './style.css';
import { Submissions } from './Submissions';

ReactDOM.render(
  <React.StrictMode>
    <BrowserRouter>
      <OsuAuthProvider>
        <Header />
        <section className='container'>
          <div className='big-center content'>
            <Switch>
              <Route exact path='/'><Submissions /></Route>
              <ProtectedRoute exact path='/admin/picks' role='any'><PicksRoundListing /></ProtectedRoute>
              <ProtectedRoute path='/admin/picks/:round' role='any'><NotReady /></ProtectedRoute>
              <ProtectedRoute path='/admin/manage' role='any'><Manage /></ProtectedRoute>
            </Switch>
          </div>
        </section>
      </OsuAuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
  document.getElementById('loved-app'),
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
//reportWebVitals();

/*
<Route path='/submit'><Submit /></Route>
            <Route path='/captains'><Captains /></Route>
            */
