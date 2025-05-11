# 数据表设计
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
disabled | int | 是否禁用（0表示未禁用，1表示已禁用）
## 原材料缺货登记 material_shortage_record
字段 | 类型 | 描述
--- | --- | ---
id | int | 主键
shop_id | int | 外卖店id
material_id | int | 原材料id
time | datetime | 缺货登记时间
order_time | datetime | 下单时间
status | int | 状态（1表示待上报，2表示已上报，3表示已下单）
## 用户角色表 user_role
字段 | 类型 | 描述
--- | --- | ---
id | int | 主键
uuid | varchar | 用户uuid
shop_id | int | 外卖店id
role | int | 角色（1表示管理员，2表示普通店员）
email | varchar | 邮箱，用于发送邮件

# 接口设计
## 上报缺货记录
请求：
```
POST /material/shortage?shop_id={shop_id}&material_id={material_id}
```
可以一次性提交多条记录，material_id用逗号分隔
权限：
- 管理员和普通店员可以上报
## 查询缺货记录
请求：
```
GET /material/shortage?shop_id={shop_id}&status={status}
```
返回所有指定status的缺货记录
可以查询多个satus，用逗号分隔
返回：
```json
[
    {
        "id": 1,
        "shop_id": 1,
        "material_id": 1,
        "time": "2023-04-01 10:00:00",
        "status": 1,
        "material": {
            "id": 1,
            "name": "原材料1",
            "type": "蔬菜",
            "unit": "斤",
            "priority": 1,
            "search_key": "蔬菜",
            "comment": "新鲜蔬菜"
        }
    }
]
```
权限：
- 管理员和普通店员可以查询
## 删除缺货记录
请求：
```
DELETE /material/shortage/{id}
```
只能删除status为1的记录
权限：
- 管理员和普通店员可以删除
## 提交缺货记录
请求：
```
POST /material/shortage/submit?shop_id={shop_id}
```
提交所有status为1的记录，将status改为2
权限：
- 管理员和普通店员可以提交
## 更新订货状态
请求：
```
POST /material/shortage/order?shop_id={shop_id}
```
请求体：
```json
{
    "shortage_ids": [1, 2, 3]
}
```
将指定的缺货记录的status改为3
权限：
- 仅管理员可以更新