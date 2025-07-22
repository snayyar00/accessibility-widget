import React from 'react';
import { Redirect, Route } from 'react-router-dom';
import * as H from 'history';
import { getAuthenticationCookie } from '@/utils/cookie';

type Props = {
  component: React.ElementType;
  path: string | string[];
  location?: H.Location;
};

const PublicRoute: React.FC<Props> = ({
  component: Component,
  path,
  ...restProps
}) => (
  <Route
    {...restProps}
    path={path}
    render={(props) =>
      getAuthenticationCookie() ? (
        <Redirect to={{ pathname: '/dashboard', state: props.location }} />
      ) : (
        <Component {...props} />
      )
    }
  />
);

export default PublicRoute;
