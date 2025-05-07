export enum StockChangeType {
  IN = 1, // 入库
  OUT = 2, // 出库
  SHORTAGE = 3, // 缺货
  ADJUST = 4, // 日常校准
}

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

export interface MaterialStockDetail extends Material {
  material_id: number;
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

export interface StockUpdateBody {
  stock: number;
  type: StockChangeType;
  comment: string;
}
