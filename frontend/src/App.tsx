import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import OcrPage from "./pages/OcrPage";
import { ConfigProvider } from "@arco-design/web-react";
import zhCN from "@arco-design/web-react/es/locale/zh-CN";
import "@arco-design/web-react/dist/css/arco.css";
import LoginPage from "./pages/LoginPage";
// import InventoryPage from "./pages/InventoryPage";
import ProtectedRoute from "./components/ProtectedRoute";
import ShortageRegisterPage from "./pages/ShortageRegisterPage";
import Layout from "./components/Layout";
import ShortageManagePage from "./pages/ShortageManagePage";

const App: React.FC = () => {
  return (
    <ConfigProvider locale={zhCN}>
      <Router>
        <Layout>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/manage/shortage"
              element={
                <ProtectedRoute>
                  <ShortageManagePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="*"
              element={
                <ProtectedRoute>
                  <ShortageRegisterPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ocr"
              element={
                <ProtectedRoute>
                  <OcrPage />
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
        </Layout>
      </Router>
    </ConfigProvider>
  );
};

export default App;
