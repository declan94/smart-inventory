import React, { useState } from "react";
import { Modal, Form, Input, Select, InputNumber, Message } from "@arco-design/web-react";
import "./StockAdjustmentModal.css";
import { AxiosError } from "axios";

const FormItem = Form.Item;
const Option = Select.Option;

interface StockAdjustmentModalProps {
  visible: boolean;
  material: any | null;
  onClose: () => void;
  onSuccess: () => void;
  api: any;
}

const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({ visible, material, onClose, onSuccess, api }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!material) return;

    try {
      await form.validate();
      const values = form.getFieldsValue();
      setLoading(true);

      await api.updateStock(material.material_id, material.shop_id.toString(), {
        stock: values.stock,
        type: values.type,
        comment: values.comment,
      });

      Message.success("库存调整成功");
      form.resetFields();
      onSuccess();
    } catch (error) {
      console.error("调整库存失败:", error);
      const errMessage = ((error as AxiosError).response?.data as any).error as string;
      if (errMessage) {
        Message.error({
          duration: 6000,
          content: errMessage,
        });
      } else {
        Message.error("调整库存失败，请重试。" + (error as AxiosError).message || "");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      title="原材料库存校准"
      visible={visible}
      onOk={handleSubmit}
      onCancel={handleCancel}
      confirmLoading={loading}
      autoFocus={false}
      unmountOnExit
    >
      {material && (
        <>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 16, fontWeight: "bold" }}>{material.name}</div>
            <div style={{ color: "#86909c" }}>
              类型: {material.type} | 单位: {material.unit}
            </div>
            <div style={{ color: "#86909c" }}>
              当前库存: {material.stock} {material.unit}
            </div>
          </div>

          <Form form={form} layout="vertical" initialValues={{ type: 4 }}>
            <FormItem label="校准原因" field="type" rules={[{ required: true, message: "请选择校准原因" }]}>
              <Select placeholder="请选择校准原因">
                <Option value={1}>入库校准</Option>
                <Option value={3}>缺货校准</Option>
                <Option value={4}>日常校准</Option>
              </Select>
            </FormItem>

            <FormItem
              label="校准后库存"
              field="stock"
              rules={[
                { required: true, message: "请输入校准后库存" },
                {
                  validator: (value, cb) => {
                    const type = form.getFieldValue("type");
                    if (type === 3 && value > material.warning_stock) {
                      return cb("缺货校准时，库存不能大于缺货预警值: " + material.warning_stock);
                    }
                    cb();
                  }
                }
              ]}
            >
              <InputNumber min={0} placeholder="请输入校准后库存" suffix={material.unit} style={{ width: "100%" }} />
            </FormItem>

            <FormItem label="详细说明" field="comment" rules={[{ required: false, message: "请输入详细说明" }]}>
              <Input.TextArea placeholder="请输入详细说明" />
            </FormItem>
          </Form>
        </>
      )}
    </Modal>
  );
};

export default StockAdjustmentModal;
