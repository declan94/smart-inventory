## 新增OCR功能

### 后端接口
后端接口已在 services/api.ts 中封装，包括：
- 创建OCR任务 createOcrTask
- 获取当前活跃的OCR任务 getOcrTask
- 上传图片，获取S3 pre-signed URL getOcrS3PresignedUrl
- 标记OCR任务为已使用 consumeOcrTask

### 前端页面
新增OCR识别页面，页面url：/ocr，页面布局和 ShortageRegisterPage.tsx 保持一致。
分为两种状态：
- 无活跃任务
- 有活跃任务
通过 getOcrTask 接口获取当前活跃任务，如果返回的任务id为空，说明没有活跃任务，否则说明有活跃任务

#### 无活跃任务状态
页面展示 arco-design 的 Upload 组件，用户可通过拖拽或者点击上传图片。（调用 getOcrS3PresignedUrl 接口，获取S3 pre-signed URL，然后通过put请求上传图片到S3）
图片上传完成后，调用 createOcrTask 接口创建OCR任务。
OCR任务创建成功后，重新调用 getOcrTask 接口获取任务详情，更新页面状态。

#### 有活跃任务状态
轮询 getOcrTask 接口查询任务状态，每5秒查询一次。

页面上半部分展示图片，当任务的 result_image_url 非空时，显示 result_image_url 的图片，否则显示 image_url 的图片。

下半部分展示结果表格和操作区域。
- 如果任务status为0，说明任务处理中，显示 “识别中” 提示和加载动画。
- 如果任务status为2，说明任务识别失败，显示“识别失败”提示和“重新上传”按钮。
- 如果任务status为1，说明任务识别成功，显示“识别结果表格”，“确认新增”按钮和“重新上传”按钮。

“识别结果表格”：显示识别到的所有 material，和 ShortageSelectModel 中的表格显示类似，可供用户勾选，默认勾选全部。
“确认新增”按钮：点击后，将勾选的 material 作为 shortage_materials 字段，调用 createShortage 接口创建新的 shortage 任务。完成后调用 consumeOcrTask 接口标记任务为已使用。
“重新上传”按钮：点击后，调用 consumeOcrTask 接口标记任务为已使用。然后调用 getOcrTask 接口获取任务详情，更新页面状态。



