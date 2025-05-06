import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AuthProvider } from "react-oidc-context";

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);

const onSigninCallback = (): void => {
  window.history.replaceState({}, document.title, window.location.pathname);
};

const cognitoAuthConfig = {
  authority: process.env.REACT_APP_COGNITO_AUTHORITY,
  client_id: process.env.REACT_APP_COGNITO_CLIENT_ID,
  redirect_uri: window.location.origin,
  post_logout_redirect_uri: window.location.origin,
  response_type: "code",
  scope: "email openid",
  onSigninCallback,
};

root.render(
  <React.StrictMode>
    <AuthProvider {...cognitoAuthConfig}>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
