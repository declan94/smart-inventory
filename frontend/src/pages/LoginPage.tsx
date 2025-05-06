import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, Typography, Space } from "@arco-design/web-react";
import { useAuth } from "react-oidc-context";

const { Title, Text } = Typography;

const LoginPage: React.FC = () => {
  const { isAuthenticated, isLoading, error, signinPopup } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/inventory");
    }
  }, [isAuthenticated, navigate]);

  if (isLoading) {
    return <div>加载中...</div>;
  }

  return (
    <div style={{ 
      display: "flex", 
      justifyContent: "center", 
      alignItems: "center", 
      height: "100vh",
      background: "#f5f5f5" 
    }}>
      <Card style={{ width: 400, boxShadow: "0 4px 10px rgba(0, 0, 0, 0.1)" }}>
        <Space direction="vertical" style={{ width: "100%", textAlign: "center" }}>
          <Title heading={3}>智能库存管理系统</Title>
          <Text>请登录以访问系统</Text>
          
          {error && (
            <div style={{ color: "red", margin: "10px 0" }}>
              登录错误: {error.message}
            </div>
          )}
          
          <Button type="primary" size="large" long onClick={() => signinPopup()}>
            登录
          </Button>
        </Space>
      </Card>
    </div>
  );
};

export default LoginPage;