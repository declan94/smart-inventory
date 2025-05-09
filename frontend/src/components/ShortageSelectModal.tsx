import { Modal, Table, Select, Input, Space, Tooltip } from "@arco-design/web-react";
import { useIsMobile } from "../utils/responsive";
import { Material } from "../types";
import { useState } from "react";
import { ColumnProps } from "@arco-design/web-react/es/Table";

const Option = Select.Option;

const ShortageSelectModal: React.FC<{
  visible: boolean;
  materials: Material[];
  loading: boolean;
  onOk: (selectedIds: number[]) => void;
  onCancel: () => void;
}> = ({ visible, materials, loading, onOk, onCancel }) => {
  const [searchText, setSearchText] = useState("");
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined);
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([]);
  const isMobile = useIsMobile();

  // 提取所有不重复的类型
  const types = Array.from(new Set(materials.map((item) => item.type)));

  // 过滤数据
  const filteredData = materials.filter((item) => {
    const matchesSearch = item.name.includes(searchText) || (item.search_key && item.search_key.includes(searchText));
    const matchesType = !typeFilter || item.type === typeFilter;
    return matchesSearch && matchesType;
  }).sort((a, b) => b.priority - a.priority);

  const columns: ColumnProps[] = [
    {
      title: "原材料名称",
      dataIndex: "name",
      render: (name: string, record: any) => (
        <Tooltip content={record.search_key} trigger={isMobile ? "click" : "hover"} position="top">
          {record.priority > 0 ? <b>{name} *</b> : name}
        </Tooltip>
      ),
    },
    {
      title: "类型",
      dataIndex: "type",
    }
  ];

  return (
    <Modal
      title="选择缺货原材料"
      visible={visible}
      onOk={() => onOk(selectedRowKeys)}
      onCancel={onCancel}
      okButtonProps={{ disabled: selectedRowKeys.length === 0 }}
      style={{ width: isMobile ? "90vw" : 700 }}
    >
      <Space style={{ marginBottom: 16 }}>
        <Select
          placeholder="类型"
          style={{ width: isMobile ? 100 : 160 }}
          value={typeFilter}
          onChange={setTypeFilter}
          allowClear
        >
          {types.map((type) => (
            <Option key={type} value={type}>
              {type}
            </Option>
          ))}
        </Select>
        <Input
          placeholder="名称"
          value={searchText}
          onChange={setSearchText}
          style={{ width: isMobile ? 120 : 200 }}
          allowClear
        />
      </Space>
      <Table
        rowKey="id"
        columns={columns}
        data={filteredData}
        loading={loading}
        rowSelection={{
          type: "checkbox",
          selectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys.map(Number)),
        }}
        pagination={false}
        scroll={{ y: 300 }}
      />
    </Modal>
  );
};

export default ShortageSelectModal;