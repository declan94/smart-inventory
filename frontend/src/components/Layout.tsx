import React, { PropsWithChildren } from "react";
import { Button, Typography, Dropdown, Menu } from "@arco-design/web-react";
import { IconUser } from "@arco-design/web-react/icon";
import { useAuth } from "react-oidc-context";
import "./Layout.css";

const { Title } = Typography;

const Layout: React.FC<PropsWithChildren> = ({ children }) => {
  const { user, removeUser } = useAuth();

  if (!user) {
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
        <Title heading={4} className="inventory-title">
          智能库存管理系统
        </Title>
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
