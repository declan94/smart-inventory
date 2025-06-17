export enum StockChangeType {
  IN = 1, // 入库
  OUT = 2, // 出库
  SHORTAGE = 3, // 缺货
  ADJUST = 4, // 日常校准
}

// DB models
export interface Material {
  id: number;
  name: string;
  type: string;
  unit: string;
  priority: number;
  search_key: string;
  comment: string;
}

export interface MaterialStock {
  id: number;
  shop_id: number;
  stock: number;
  warning_stock: number;
}

export interface StockChangeRecord {
  id: number;
  material_id: number;
  shop_id: number;
  type: number;
  comment: string;
  prev_stock: number;
  post_stock: number;
  change_time: Date;
  operator: string;
}

// 外卖平台订单
export interface DistOrder {
  id: number;
  skuList: {
    name: string; // 用于提取套餐类订单的attrs
    skuId: number;
    count: number;
  }[];
}

export interface UserRole {
  uuid: string;
  shop_id: number;
  role: number;
  email: string;
}

export interface SupplierDetail {
  material_id: number;
  supplier_name: string;
  supplier_priority: string;
}

