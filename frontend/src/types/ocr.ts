
export interface OcrTask {
  id: number;
  shop_id: number;
  prediction_id: string;
  image_url: string;
  result_image_url: string;
  material_ids: number[];
  status: number;
  consumed: boolean;
}

export interface PresignedS3Url {
    url: string;
    public_url: string;
}