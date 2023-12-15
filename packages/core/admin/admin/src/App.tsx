/**
 *
 * App.js
 *
 */

import * as React from 'react';
import { useEffect, useRef, useState } from 'react';

import { SkipToContent } from '@strapi/design-system';
import {
  auth,
  LoadingIndicatorPage,
  MenuItem,
  TrackingProvider,
  useAppInfo,
  useFetchClient,
  useNotification,
} from '@strapi/helper-plugin';
import merge from 'lodash/merge';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';
import { Route, Switch } from 'react-router-dom';
import * as rrweb from 'rrweb';
import rrwebPlayer from 'rrweb-player';
import 'rrweb-player/dist/style.css';

import {
  ConfigurationProvider,
  ConfigurationProviderProps,
} from './components/ConfigurationProvider';
import { PrivateRoute } from './components/PrivateRoute';
import { ADMIN_PERMISSIONS_CE, ACTION_SET_ADMIN_PERMISSIONS } from './constants';
import { useEnterprise } from './hooks/useEnterprise';
import { AuthPage } from './pages/Auth/AuthPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { UseCasePage } from './pages/UseCasePage';
import { createRoute } from './utils/createRoute';

type StrapiRoute = Pick<MenuItem, 'exact' | 'to'> & Required<Pick<MenuItem, 'Component'>>;

const ROUTES_CE: StrapiRoute[] | null = null;

const AuthenticatedApp = React.lazy(() =>
  import('./components/AuthenticatedApp').then((mod) => ({ default: mod.AuthenticatedApp }))
);

interface AppProps extends Omit<ConfigurationProviderProps, 'children' | 'authLogo' | 'menuLogo'> {
  authLogo: string;
  menuLogo: string;
}

let events = [];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ReplayComponent = ({ events }: any[]) => {
  // eslint-disable-next-line no-console
  // console.log(events);
  const playerRef = useRef();

  useEffect(() => {
    if (playerRef.current && events) {
      new rrwebPlayer({
        target: playerRef.current, // the DOM element where the player will append
        props: {
          events,
        },
      });
    }
  }, [events]);

  return <div ref={playerRef} />;
};

export const App = ({ authLogo, menuLogo, showReleaseNotification, showTutorials }: AppProps) => {
  const [shouldShowReplay, setShouldShowReplay] = useState(false);
  const adminPermissions = useEnterprise(
    ADMIN_PERMISSIONS_CE,
    async () => (await import('../../ee/admin/src/constants')).ADMIN_PERMISSIONS_EE,
    {
      combine(cePermissions, eePermissions) {
        // the `settings` NS e.g. are deep nested objects, that need a deep merge
        return merge({}, cePermissions, eePermissions);
      },

      defaultValue: ADMIN_PERMISSIONS_CE,
    }
  );
  const routes = useEnterprise(
    ROUTES_CE,
    async () => (await import('../../ee/admin/src/constants')).ROUTES_EE,
    {
      defaultValue: [],
    }
  );
  const toggleNotification = useNotification();
  const { formatMessage } = useIntl();
  const [
    { isLoading, hasAdmin, uuid, deviceId, authLogo: customAuthLogo, menuLogo: customMenuLogo },
    setState,
  ] = React.useState<{
    isLoading: boolean;
    hasAdmin: boolean;
    uuid: string | false;
    deviceId: string | undefined;
    authLogo?: string;
    menuLogo?: string;
  }>({
    isLoading: true,
    deviceId: undefined,
    hasAdmin: false,
    uuid: false,
  });
  const dispatch = useDispatch();
  const appInfo = useAppInfo();
  const { get, post } = useFetchClient();

  const authRoutes = React.useMemo(() => {
    if (!routes) {
      return null;
    }

    return routes.map(({ to, Component, exact }) => createRoute(Component, to, exact));
  }, [routes]);

  const [telemetryProperties, setTelemetryProperties] = React.useState(undefined);

  React.useEffect(() => {
    dispatch({ type: ACTION_SET_ADMIN_PERMISSIONS, payload: adminPermissions });
  }, [adminPermissions, dispatch]);

  React.useEffect(() => {
    const currentToken = auth.getToken();

    const renewToken = async () => {
      try {
        const {
          data: {
            data: { token },
          },
        } = await post('/admin/renew-token', { token: currentToken });
        auth.updateToken(token);
      } catch (err) {
        // Refresh app
        auth.clearAppStorage();
        window.location.reload();
      }
    };

    if (currentToken) {
      renewToken();
    }
  }, [post]);

  React.useEffect(() => {
    const getData = async () => {
      try {
        const {
          data: {
            data: { hasAdmin, uuid, authLogo, menuLogo },
          },
        } = await get(`/admin/init`);

        if (uuid) {
          const {
            data: { data: properties },
          } = await get(`/admin/telemetry-properties`, {
            // NOTE: needed because the interceptors of the fetchClient redirect to /login when receive a 401 and it would end up in an infinite loop when the user doesn't have a session.
            validateStatus: (status) => status < 500,
          });

          setTelemetryProperties(properties);

          try {
            const event = 'didInitializeAdministration';
            post(
              'https://analytics.strapi.io/api/v2/track',
              {
                // This event is anonymous
                event,
                userId: '',
                deviceId,
                eventPropeties: {},
                userProperties: { environment: appInfo.currentEnvironment },
                groupProperties: { ...properties, projectId: uuid },
              },
              {
                headers: {
                  'X-Strapi-Event': event,
                },
              }
            );
          } catch (e) {
            // Silent.
          }
        }

        setState({ isLoading: false, hasAdmin, uuid, deviceId, authLogo, menuLogo });
      } catch (err) {
        toggleNotification({
          type: 'warning',
          message: { id: 'app.containers.App.notification.error.init' },
        });
      }
    };

    getData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toggleNotification]);

  const trackingInfo = React.useMemo(
    () => ({
      uuid,
      telemetryProperties,
      deviceId,
    }),
    [uuid, telemetryProperties, deviceId]
  );

  useEffect(() => {
    rrweb.record({
      emit(event) {
        // Here you can store the event data
        // For example, sending it to a server or storing in state
        // eslint-disable-next-line no-console
        // console.log(event);
        events.push(event);
      },
    });
  }, []);

  // this function will send events to the backend and reset the events array
  function save() {
    const body = JSON.stringify({ events });
    console.log('Events body:', body);
    events = [];

    // fetch('http://YOUR_BACKEND_API', {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //   },
    //   body,
    // });
  }

  // save events every 5 seconds
  // setInterval(save, 5 * 1000);

  if (isLoading) {
    return <LoadingIndicatorPage />;
  }

  return (
    <React.Suspense fallback={<LoadingIndicatorPage />}>
      <button
        onClick={() => {
          setShouldShowReplay(true);
          console.log(JSON.stringify(events));
        }}
      >
        View replay
      </button>
      {shouldShowReplay && <ReplayComponent events={events}></ReplayComponent>}
      <SkipToContent>
        {formatMessage({ id: 'skipToContent', defaultMessage: 'Skip to content' })}
      </SkipToContent>
      <ConfigurationProvider
        authLogo={{
          default: authLogo,
          custom: {
            url: customAuthLogo,
          },
        }}
        menuLogo={{
          default: menuLogo,
          custom: {
            url: customMenuLogo,
          },
        }}
        showReleaseNotification={showReleaseNotification}
        showTutorials={showTutorials}
      >
        <TrackingProvider value={trackingInfo}>
          <Switch>
            {authRoutes}
            <Route
              path="/auth/:authType"
              render={(routerProps) => <AuthPage {...routerProps} hasAdmin={hasAdmin} />}
              exact
            />
            <PrivateRoute path="/replay" component={ReplayComponent} events={events} />
            <PrivateRoute path="/usecase" component={UseCasePage} />
            <PrivateRoute path="/" component={AuthenticatedApp} />
            <Route path="" component={NotFoundPage} />
          </Switch>
        </TrackingProvider>
      </ConfigurationProvider>
    </React.Suspense>
  );
};
