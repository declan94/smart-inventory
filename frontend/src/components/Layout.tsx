import React, { PropsWithChildren } from "react";
import { Button, Typography, Dropdown, Menu } from "@arco-design/web-react";
import { IconUser } from "@arco-design/web-react/icon";
import { useAuth } from "react-oidc-context";
import { Link, useLocation } from "react-router-dom";
import "./Layout.css";
import { useIsMobile } from "../utils/responsive";

const { Title } = Typography;

// 导航栏组件
const NavigationBar: React.FC = () => {
  const location = useLocation();
  const currentPath = location.pathname;

  const pathToKeyMap: Record<string, string> = {
    "/ocr": "/",
  };

  return (
    <div className="nav-bar">
      <Menu mode="horizontal" selectedKeys={[pathToKeyMap[currentPath] || currentPath]}>
        <Menu.Item key="/">
          <Link type="text" to="/">
            缺货登记
          </Link>
        </Menu.Item>
        <Menu.Item key="/manage/shortage">
          <Link type="text" to="/manage/shortage">
            订货管理
          </Link>
        </Menu.Item>
      </Menu>
    </div>
  );
};

const Layout: React.FC<PropsWithChildren> = ({ children }) => {
  const { user, removeUser, isAuthenticated } = useAuth();
  const isMobile = useIsMobile();

  if (!user || !isAuthenticated) {
    return <>{children}</>;
  }

  const signout = () => {
    removeUser();
    const logoutReturnUri = encodeURIComponent(window.location.origin);
    const clientId = encodeURIComponent(process.env.REACT_APP_COGNITO_CLIENT_ID || "");
    const logoutURI = `${process.env.REACT_APP_COGNITO_DOMAIN}/logout?client_id=${clientId}&logout_uri=${logoutReturnUri}`;
    window.location.href = logoutURI;
  };

  const dropList = (
    <Menu>
      {/* <Menu.Item key="profile">
        <span>个人信息</span>
      </Menu.Item> */}
      <Menu.Item key="logout" onClick={signout}>
        <span>退出登录</span>
      </Menu.Item>
    </Menu>
  );

  return (
    <div className="inventory-root">
      <div className="inventory-header">
        {!isMobile && (
          <Title heading={4} className="inventory-title">
            智能库存管理系统
          </Title>
        )}
        <NavigationBar />
        <Dropdown droplist={dropList} position="br">
          <Button type="text" icon={<IconUser />}>
            {(user?.profile as any)["cognito:username"] || "用户"}
          </Button>
        </Dropdown>
      </div>
      {children}
    </div>
  );
};

export default Layout;
