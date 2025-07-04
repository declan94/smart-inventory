# 具体页面设计

## 1. 缺货登记页面
### 1.1 页面功能
- 显示已经登记的缺货原材料列表，包括原材料的名称、类型、登记时间、状态信息（待提交、已提交）
- 可以新增登记缺货的原材料信息，从GET /materials 接口获取原材料列表供用户搜索选择
- 可以删除已经登记但是还未提交的缺货原材料信息
- 可以提交已经登记的缺货原材料信息，提交后状态信息变为“已提交”，不可修改
### 1.2 页面布局
- 页面顶部有两个按钮，分别是“新增”和“提交”按钮
- 页面主体是一个表格，表格的每一行代表一个缺货登记信息。
- 点击新增按钮，弹出一个对话框
    - 对话框中显示所有原材料的表格
    - 可以根据类型筛选材料，可以根据名称搜索材料
    - 表格每一行可以勾选材料
    - 点击提交按钮，将勾选的材料添加到页面中


## 2. 缺货管理页面
### 1.1 页面功能
- 显示已经提交的缺货原材料列表，包括原材料的名称、类型、登记时间、状态信息（待处理、已处理）
- 可以处理已经提交的缺货原材料信息，处理后状态信息变为“已处理”，不可修改。（支持批量处理）
### 1.2 页面布局
- 页面主体是一个表格，表格的每一行代表一个缺货登记信息。只显示状态为“已提交”的信息。
- 表格每一行可以勾选材料
- 点击处理按钮，将勾选的材料状态更新为“已下单”