import React, { useEffect, useState } from "react";
import { Table, Button, Message, Tag, Space, Tooltip, Modal } from "@arco-design/web-react";
import { IconCheck } from "@arco-design/web-react/icon";
import { useApi } from "../services/api";
import { MaterialAddOn, ShortageRecord } from "../types";
import { ColumnProps } from "@arco-design/web-react/es/Table";
import { useIsMobile } from "../utils/responsive";
import { AxiosError } from "axios";
import Title from "@arco-design/web-react/es/Typography/title";
import { supplierColor } from "./PendingOrderTable";

interface MaterialWithSuppliers extends MaterialAddOn {
  suppliers: Record<string, string>;
}

interface AddOnTableProps {
  shopId: number;
  shortages: ShortageRecord[];
  fetchShortages: () => Promise<void>;
  supplierNames: string[];
}

export const AddOnTable: React.FC<AddOnTableProps> = (props: AddOnTableProps) => {
  const { shopId, fetchShortages, supplierNames, shortages } = props;
  const api = useApi();
  const isMobile = useIsMobile();

  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([]);
  const [addonMaterials, setAddonMaterials] = useState<MaterialWithSuppliers[]>([]);
  const [loading, setLoading] = useState(false);
  const fetchAddOnMaterials = async () => {
    setLoading(true);
    try {
      const addons = await api.getAddOnMaterials(shopId);
      const materialIds = addons.map((s) => s.id);
      if (materialIds.length === 0) {
        setAddonMaterials([]);
        setSelectedRowKeys([]);
        return;
      }
      const allSuppliers = await api.getMaterialSuppliers(materialIds);
      const withSuppliers = addons.map((m) => {
        const suppliers = allSuppliers.filter((s) => s.material_id === m.id);
        const row: MaterialWithSuppliers = {
          ...m,
          suppliers: {},
        };
        suppliers.forEach((s) => {
          row["suppliers"][s.supplier_name] = s.supplier_priority;
        });
        return row;
      });
      setAddonMaterials(withSuppliers);
    } catch (e) {
      Message.error("获取凑单推荐失败。" + (e as AxiosError).message || "");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAddOnMaterials();
    // eslint-disable-next-line
  }, [shopId, shortages]);

  // 批量处理（将选中项状态记录为已下单）
  const handleBatchOrder = async () => {
    if (selectedRowKeys.length === 0) return;
    Modal.confirm({
      title: "确认处理",
      content: `确定将选中的凑单商品登记为"已下单"吗？`,
      style: isMobile ? { top: 0, width: "100vw", maxWidth: "100vw", borderRadius: 0, padding: 12 } : {},
      onOk: async () => {
        try {
          await api.orderAddOnMaterials(shopId, selectedRowKeys);
          Message.success("处理成功");
          setSelectedRowKeys([]);
          fetchShortages();
        } catch (error) {
          const errMessage = ((error as AxiosError).response?.data as any).error as string;
          if (errMessage) {
            Message.error({
              duration: 6000,
              content: errMessage,
            });
          } else {
            Message.error("处理失败。" + (error as AxiosError).message || "");
          }
        }
      },
    });
  };

  const tipsForRow = (record: MaterialWithSuppliers) => {
    return (
      <>
        <div>{record.search_key}</div>
        <div>{record.comment}</div>
        <div>上次下单：{record.last_order_time.substring(0, 10)}</div>
      </>
    );
  };
  const columns: ColumnProps[] = [
    {
      title: isMobile ? "原材料" : "原材料名称",
      dataIndex: "name",
      render: (name: string, record: MaterialWithSuppliers) => (
        <Tooltip content={tipsForRow(record)} trigger={isMobile ? "click" : "hover"} position="top">
          {record.priority > 0 ? <b>{name}</b> : name}
        </Tooltip>
      ),
    },
    {
      title: "搜索关键词",
      dataIndex: "search_key",
    },
    {
      title: "备注",
      dataIndex: "comment",
    },
    {
      title: "上次下单",
      dataIndex: "last_order_time",
      render: (t: string) => t.substring(0, 10),
    },
    ...supplierNames.map((name) => ({
      title: name,
      dataIndex: `suppliers.${name}`,
      render: (priority: string) => (priority ? <Tag color={supplierColor(priority)}>{priority}</Tag> : <></>),
      sorter: (a: MaterialWithSuppliers, b: MaterialWithSuppliers) => {
        const pa = a["suppliers"][name] || "z";
        const pb = b["suppliers"][name] || "z";
        return pa === pb ? 0 : pa < pb ? -1 : 1;
      },
      filters: [
        { text: "*", value: "*" },
        ...Array.from(new Set(addonMaterials.filter((s) => s["suppliers"][name]).map((s) => s["suppliers"][name])))
          .sort((a, b) => (a < b ? -1 : 1))
          .map((p) => ({ text: p.toString(), value: p.toString() })),
      ],
      onFilter: (value: string, record: MaterialWithSuppliers) =>
        value === "*" ? !!record["suppliers"][name] : record["suppliers"][name] === value,
    })),
  ].filter((c) => !isMobile || !["type", "search_key", "comment", "last_order_time"].includes(c.dataIndex));

  return addonMaterials.length > 0 ? (
    <>
      <div style={{ display: "flex", alignItems: "center" }}>
        <Title heading={6}>凑单候选</Title>
        <Space style={{ margin: 4 }}></Space>
        {selectedRowKeys.length > 0 && (
          <Button
            type="primary"
            icon={<IconCheck />}
            onClick={handleBatchOrder}
            disabled={selectedRowKeys.length === 0}
          >
            已下单
          </Button>
        )}
      </div>
      <Table
        columns={columns}
        data={addonMaterials}
        rowKey="id"
        loading={loading}
        pagination={false}
        rowSelection={{
          type: "checkbox",
          selectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys.map(Number)),
        }}
      />
    </>
  ) : (
    <></>
  );
};
