import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ConfigProvider } from "@arco-design/web-react";
import zhCN from "@arco-design/web-react/es/locale/zh-CN";
import "@arco-design/web-react/dist/css/arco.css";
import LoginPage from "./pages/LoginPage";
// import InventoryPage from "./pages/InventoryPage";
import ProtectedRoute from "./components/ProtectedRoute";
import ShortageRegisterPage from "./pages/ShortageRegisterPage";

const App: React.FC = () => {
  return (
    <ConfigProvider locale={zhCN}>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="*"
            element={
              <ProtectedRoute>
                <ShortageRegisterPage />
              </ProtectedRoute>
            }
          />
          {/* <Route
            path="*"
            element={
              <ProtectedRoute>
                <InventoryPage />
              </ProtectedRoute>
            }
          /> */}
        </Routes>
      </Router>
    </ConfigProvider>
  );
};

export default App;
