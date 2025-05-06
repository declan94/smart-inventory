# 功能概述
我们要做一个外卖店原材料的库存管理系统，主要功能有：
1. 原材料的库存管理：记录和维护各个原材料的库存数量、库存预警值、库存预警状态等信息。
2. 原材料的库存校准：当原材料的库存数量和实际情况不符时，需要进行校准。校准场景有：
    - 新到货原材料进行入库时，进行校准。
    - 发现原材料实际库存告急时，进行校准。
    - 日常校准，定期进行库存盘点和校准。

# 数据表设计
## 外卖店信息表 shop
字段 | 类型 | 描述
--- | --- | ---
id | int | 主键
name | varchar | 外卖店名称
address | varchar | 外卖店地址
## 供货平台信息表 supplier
字段 | 类型 | 描述
--- | --- | ---
id | int | 主键
name | varchar | 平台名称
min_price | double | 最低供货价格
## 原材料信息表 material
字段 | 类型 | 描述
--- | --- | ---
id | int | 主键
name | varchar | 原材料名称
type | varchar | 原材料类型
unit | varchar | 原材料单位
priority | int | 优先级（1表示缺货时必须立即采购）
search_key | varchar | 搜索关键字
comment | varchar | 备注说明
warning_stock | double | 库存预警值
## 原材料供货商信息表 material_supplier
字段 | 类型 | 描述
--- | --- | ---
id | int | 主键
material_id | int | 原材料id
supplier_id | int | 供货商id
supplier_priority | varchar(1) | 供货商优先级（a>b>c>d）
package_size | double | 包装规格
package_price | double | 价格
## 原材料库存表 material_stock
字段 | 类型 | 描述
--- | --- | ---
id | int | 主键
shop_id | int | 外卖店id
material_id | int | 原材料id
stock | double | 库存数量
## 原材料库存变更记录表 stock_change_record
字段 | 类型 | 描述
--- | --- | ---
id | int | 主键
shop_id | int | 外卖店id
material_id | int | 原材料id
type | int | 变更类型（1表示入库，2表示出库，3表示缺货校准，4表示日常校准）
comment | varchar | 变更原因
prev_stock | double | 变更前库存数量
post_stock | double | 变更后库存数量
change_time | datetime | 变更时间
operator | varchar | 变更人

# 接口设计
## 查询所有库存
请求：
```
GET /material/stock?shop_id={shop_id}
```
返回所有库存信息，包括material的字段以及material_stock的字段。
## 更新库存
请求：
```
PATCH /material/{material_id}/stock?shop_id={shop_id}
```
请求体：
```json
{
    "stock": 100.0,
    "type": 1,
    "comment": "新到货"
}
```

# 架构设计
1. 使用AWS SAM搭建无服务后端
2. 数据库使用AWS RDS Aurora，使用MySQL
3. 接口使用AWS API Gateway，使用AWS Lambda作为后端
4. 使用typescript作为后端语言
5. 使用Cognito管理用户鉴权