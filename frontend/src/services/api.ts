import axios from "axios";
import { useAuth } from "react-oidc-context";

const API_URL = process.env.REACT_APP_API_URL || "https://your-api-gateway-url.amazonaws.com/prod";

export const useApi = () => {
  const { user, signinSilent } = useAuth();
  
  const apiClient = axios.create({
    baseURL: API_URL,
  });

  // 请求拦截器，添加认证 Token
  apiClient.interceptors.request.use(
    (config) => {
      const token = user?.id_token
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // 响应拦截器，自动刷新 token 并重试
  apiClient.interceptors.response.use(
    response => response,
    async error => {
      const originalRequest = error.config;
      // 检查是否为401且未重试过
      if (error.response && error.response.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;
        try {
          // 静默刷新token
          await signinSilent?.();
          // 重新设置Authorization头
          const newToken = user?.id_token;
          if (newToken) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
          }
          // 重试原请求
          return apiClient(originalRequest);
        } catch (refreshError) {
          // 刷新失败，跳转登录或返回错误
          return Promise.reject(refreshError);
        }
      }
      return Promise.reject(error);
    }
  );
  
  return {
    // 获取库存
    getStock: async (shopId: number) => {
      const response = await apiClient.get(`/material/stock?shop_id=${shopId}`);
      return response.data;
    },
    
    // 更新库存
    updateStock: async (materialId: number, shopId: number, data: any) => {
      const response = await apiClient.patch(`/material/${materialId}/stock?shop_id=${shopId}`, data);
      return response.data;
    },
  };
};