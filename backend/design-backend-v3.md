# 数据表设计
## 报货单OCR识别任务表 ocr_task
字段 | 类型 | 描述
--- | --- | ---
id | int | 主键
shop_id | int | 店铺ID
prediction_id | string | Replicate上的识别任务ID
image_url | string | 报货单图片URL
result_image_url | string | 识别结果图片URL
material_ids | json | 识别到的物料ID列表
status | int | 状态（0表示OCR识别中，1表示已识别成功，2表示失败）
consumed | tinyint | 是否已被处理（0表示未处理，1表示已处理）