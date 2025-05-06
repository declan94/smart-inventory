添加示例代码到您的应用程序
1
根据允许的回调 URL、注销 URL 和您想要请求的范围（例如 openid 和 profile）配置用户池应用程序客户端。了解更多 

2
安装 oidc-client-ts  和 react-oidc-context  库。

```shell
npm install oidc-client-ts react-oidc-context --save
```
3
使用用户池的 OIDC 属性配置 react-oidc-context。

```typescript
// index.js
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AuthProvider } from "react-oidc-context";

const cognitoAuthConfig = {
  authority: "https://cognito-idp.ap-southeast-1.amazonaws.com/ap-southeast-1_h1U96gLEq",
  client_id: "1414r1s4e9juejjfnjcsv6hord",
  redirect_uri: "http://localhost:3000",
  response_type: "code",
  scope: "email openid phone",
};

const root = ReactDOM.createRoot(document.getElementById("root"));

// wrap the application with AuthProvider
root.render(
  <React.StrictMode>
    <AuthProvider {...cognitoAuthConfig}>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
```

4
生成登录按钮，用于向您的用户池 OIDC 提供商发起授权请求，以及用于发起注销请求的注销按钮。

```typescript
// App.js

import { useAuth } from "react-oidc-context";

function App() {
  const auth = useAuth();

  const signOutRedirect = () => {
    const clientId = "1414r1s4e9juejjfnjcsv6hord";
    const logoutUri = "<logout uri>";
    const cognitoDomain = "https://ap-southeast-1h1u96gleq.auth.ap-southeast-1.amazoncognito.com";
    window.location.href = `${cognitoDomain}/logout?client_id=${clientId}&logout_uri=${encodeURIComponent(logoutUri)}`;
  };

  if (auth.isLoading) {
    return <div>Loading...</div>;
  }

  if (auth.error) {
    return <div>Encountering error... {auth.error.message}</div>;
  }

  if (auth.isAuthenticated) {
    return (
      <div>
        <pre> Hello: {auth.user?.profile.email} </pre>
        <pre> ID Token: {auth.user?.id_token} </pre>
        <pre> Access Token: {auth.user?.access_token} </pre>
        <pre> Refresh Token: {auth.user?.refresh_token} </pre>

        <button onClick={() => auth.removeUser()}>Sign out</button>
      </div>
    );
  }

  return (
    <div>
      <button onClick={() => auth.signinRedirect()}>Sign in</button>
      <button onClick={() => signOutRedirect()}>Sign out</button>
    </div>
  );
}

export default App;
```