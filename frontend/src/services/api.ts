import axios from "axios";
import { useAuth } from "react-oidc-context";

const API_URL = process.env.REACT_APP_API_URL || "https://your-api-gateway-url.amazonaws.com/prod";

// 将整个逻辑改为自定义 Hook
export const useApi = () => {
  const { user } = useAuth();
  
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
  
  return {
    // 获取库存
    getStock: async (shopId: string) => {
      const response = await apiClient.get(`/material/stock?shop_id=${shopId}`);
      return response.data;
    },
    
    // 更新库存
    updateStock: async (materialId: number, shopId: string, data: any) => {
      const response = await apiClient.patch(`/material/${materialId}/stock?shop_id=${shopId}`, data);
      return response.data;
    },
  };
};