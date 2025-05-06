export interface Material {
  id: number;
  material_id: number;
  name: string;
  type: string;
  unit: string;
  shop_id: number;
  stock: number;
  warning_stock: number;
}

export interface StockAdjustment {
  stock: number;
  type: number; // 1: 入库校准, 2: 缺货校准, 3: 日常校准
  comment: string;
}

export enum AdjustmentType {
  RESTOCK = 1,
  SHORTAGE = 2,
  ROUTINE = 3
}