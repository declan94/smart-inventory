import React, { useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { Spin } from "@arco-design/web-react";
import { useAuth } from "react-oidc-context";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { signinSilent, isAuthenticated, isLoading, error } = useAuth();
  const [triedSigninSilent, setTriedSigninSilent] = useState(false);

  useEffect(() => {
    if (isLoading) {
      return;
    }
    if (isAuthenticated) {
      return;
    }
    if (signinSilent && !triedSigninSilent) {
      setTriedSigninSilent(true);
      signinSilent?.({ scope: "email sub" });
    }
  }, [signinSilent, triedSigninSilent, setTriedSigninSilent, isLoading, isAuthenticated]);

  if (isAuthenticated) {
    return <>{children}</>;
  }

  if (error) {
    return <div>发生错误: {error.message}</div>;
  }

  if (isLoading || !triedSigninSilent) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <Spin size={128} tip="加载中..." />
      </div>
    );
  }

  return <Navigate to="/login" replace />;
};

export default ProtectedRoute;
