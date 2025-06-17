import axios from "axios";
import { useAuth } from "react-oidc-context";
import { ShortageRecord, SupplierDetail } from "../types";

const API_URL = process.env.REACT_APP_API_URL || "https://your-api-gateway-url.amazonaws.com/prod";

export const useApi = () => {
  const { user, signinSilent } = useAuth();

  const apiClient = axios.create({
    baseURL: API_URL,
  });

  // 请求拦截器，添加认证 Token
  apiClient.interceptors.request.use(
    (config) => {
      const token = user?.id_token;
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
    (response) => response,
    async (error) => {
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

    // 获取缺货登记列表
    getShortageList: async (shopId: number, statusFilter: number | number[]): Promise<ShortageRecord[]> => {
      const status = Array.isArray(statusFilter) ? statusFilter.join(",") : statusFilter;
      const response = await apiClient.get(`/material/shortage`, {
        params: { shop_id: shopId, status },
      });
      return response.data;
    },

    // 新增缺货登记
    addShortage: async (shopId: number, materialId: number[]) => {
      const response = await apiClient.post(`/material/shortage`, null, {
        params: { shop_id: shopId, material_id: materialId.join(",") },
      });
      return response.data;
    },

    // 删除未提交的缺货登记
    deleteShortage: async (shopId: number, id: number) => {
      const response = await apiClient.delete(`/material/shortage/${id}?shop_id=${shopId}`);
      return response.data;
    },

    // 更新缺货登记的优先级
    updateShortagePriority: async (shopId: number, id: number, priority: number) => {
      const response = await apiClient.patch(`/material/shortage/${id}?shop_id=${shopId}`, {
        priority,
      });
      return response.data;
    },

    // 批量提交缺货登记
    submitShortage: async (shopId: number) => {
      const response = await apiClient.post(`/material/shortage/submit`, null, {
        params: { shop_id: shopId },
      });
      return response.data;
    },

    // 获取原材料列表
    getMaterials: async () => {
      const response = await apiClient.get(`/material`);
      return response.data;
    },

    // 获取原材料的供货商信息
    getMaterialSuppliers: async (materialIds: number[]): Promise<SupplierDetail[]> => {
      const response = await apiClient.get(`/material/supplier?material_id=${materialIds.join(',')}`);
      return response.data;
    },

    // 更新缺货记录状态
    orderShortages: async (shopId: number, shortageIds: number[]) => {
      const response = await apiClient.post(`/material/shortage/order?shop_id=${shopId}`, {
        shortage_ids: shortageIds,
      });
      return response.data;
    },
  };
};
