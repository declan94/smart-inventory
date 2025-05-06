import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { ConfigProvider } from "@arco-design/web-react";
import zhCN from "@arco-design/web-react/es/locale/zh-CN";
import "@arco-design/web-react/dist/css/arco.css";
import { AuthProvider } from "react-oidc-context";
import LoginPage from "./pages/LoginPage";
import InventoryPage from "./pages/InventoryPage";
import ProtectedRoute from "./components/ProtectedRoute";

const cognitoAuthConfig = {
    authority: process.env.REACT_APP_COGNITO_AUTHORITY,
    client_id: process.env.REACT_APP_COGNITO_CLIENT_ID,
    redirect_uri: window.location.origin,
    response_type: "code",
    scope: "email openid",
  };

const App: React.FC = () => {
  return (
    <ConfigProvider locale={zhCN}>
      <AuthProvider {...cognitoAuthConfig}>
        <Router>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route 
              path="/inventory" 
              element={
                <ProtectedRoute>
                  <InventoryPage />
                </ProtectedRoute>
              } 
            />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ConfigProvider>
  );
};

export default App;