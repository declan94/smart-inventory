import React, { useEffect, useState } from "react";
import { Table, Button, Message, Tag, Space, Tooltip, Modal } from "@arco-design/web-react";
import { IconCheck } from "@arco-design/web-react/icon";
import { useApi } from "../services/api";
import { ShortageRecord } from "../types";
import { ColumnProps } from "@arco-design/web-react/es/Table";
import { useIsMobile } from "../utils/responsive";
import { AxiosError } from "axios";
import Title from "@arco-design/web-react/es/Typography/title";
import { AddOnTable } from "./AddOnTable";

interface ShortageRecordWithSupplier extends ShortageRecord {
  suppliers: Record<string, string>;
}

interface PendingTableProps {
  shopId: number;
  shortages: ShortageRecord[];
  fetchShortages: () => Promise<void>;
}

export const supplierColor = (priority: string) => {
  switch (priority) {
    case "a":
      return "green";
    case "b":
      return "blue";
    default:
      return "orange";
  }
};

export const PendingOrderShortagesTable: React.FC<PendingTableProps> = (props: PendingTableProps) => {
  const { shortages, shopId, fetchShortages } = props;
  const api = useApi();
  const isMobile = useIsMobile();

  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([]);
  const [supplierNames, setSupplierNames] = useState<string[]>([]);
  const [shortagesWithSupplier, setShortagesWithSupplier] = useState<ShortageRecordWithSupplier[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const fetchSuppliers = async () => {
    const pendingShortages = shortages
      .filter((s) => s.status === 2)
      .sort((a, b) => (b.material.priority - a.material.priority) * 10 + b.priority - a.priority);
    const materialIds = pendingShortages.map((s) => s.material_id);
    if (materialIds.length === 0) {
      setSupplierNames([]);
      setShortagesWithSupplier([]);
      setSelectedRowKeys([]);
      return;
    }
    setLoadingSuppliers(true);
    try {
      const allSuppliers = await api.getMaterialSuppliers(materialIds);
      const supplierNames = Array.from(new Set(allSuppliers.map((s) => s.supplier_name)));
      const withSuppliers = pendingShortages.map((sh) => {
        const suppliers = allSuppliers.filter((s) => s.material_id === sh.material_id);
        const row: ShortageRecordWithSupplier = {
          ...sh,
          suppliers: {},
        };
        suppliers.forEach((s) => {
          row["suppliers"][s.supplier_name] = s.supplier_priority;
        });
        return row;
      });
      setSupplierNames(supplierNames);
      setShortagesWithSupplier(withSuppliers);
    } catch (e) {
      Message.error("获取供应商信息失败。" + (e as AxiosError).message || "");
    } finally {
      setLoadingSuppliers(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
    // eslint-disable-next-line
  }, [shortages]);

  // 批量处理（将选中项状态改为已下单）
  const handleBatchOrder = async () => {
    if (selectedRowKeys.length === 0) return;
    Modal.confirm({
      title: "确认处理",
      content: `确定将选中的缺货登记标记为"已下单"吗？`,
      style: isMobile ? { top: 0, width: "100vw", maxWidth: "100vw", borderRadius: 0, padding: 12 } : {},
      onOk: async () => {
        try {
          await api.orderShortages(shopId, selectedRowKeys);
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

  const tipsForRow = (record: ShortageRecord) => {
    return (
      <>
        <div>{record.material.search_key}</div>
        <div> {record.material.comment}</div>
      </>
    );
  };
  const supplierColumns: ColumnProps[] = [
    {
      title: isMobile ? "原材料" : "原材料名称",
      dataIndex: "material.name",
      render: (name: string, record: ShortageRecord) => (
        <Tooltip content={tipsForRow(record)} trigger={isMobile ? "click" : "hover"} position="top">
          {record.material.priority > 0 ? <b>{name} *</b> : record.priority > 0 ? name + " *" : name}
        </Tooltip>
      ),
    },
    {
      title: "搜索关键词",
      dataIndex: "material.search_key",
    },
    {
      title: "备注",
      dataIndex: "material.comment",
    },
    ...supplierNames.map((name) => ({
      title: name,
      dataIndex: `suppliers.${name}`,
      render: (priority: string) => (priority ? <Tag color={supplierColor(priority)}>{priority}</Tag> : <></>),
      sorter: (a: ShortageRecordWithSupplier, b: ShortageRecordWithSupplier) => {
        const pa = a["suppliers"][name] || "z";
        const pb = b["suppliers"][name] || "z";
        return pa === pb ? 0 : pa < pb ? -1 : 1;
      },
      filters: [
        { text: "*", value: "*" },
        ...Array.from(
          new Set(shortagesWithSupplier.filter((s) => s["suppliers"][name]).map((s) => s["suppliers"][name]))
        )
          .sort((a, b) => (a < b ? -1 : 1))
          .map((p) => ({ text: p.toString(), value: p.toString() })),
      ],
      onFilter: (value: string, record: ShortageRecordWithSupplier) =>
        value === "*" ? !!record["suppliers"][name] : record["suppliers"][name] === value,
    })),
  ].filter((c) => !isMobile || !["material.type", "material.search_key", "material.comment"].includes(c.dataIndex));

  return shortagesWithSupplier.length > 0 ? (
    <>
      <div style={{ display: "flex", alignItems: "center" }}>
        <Title heading={6}>待下单</Title>
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
        columns={supplierColumns}
        data={shortagesWithSupplier}
        rowKey="id"
        loading={loadingSuppliers}
        pagination={false}
        rowSelection={{
          type: "checkbox",
          selectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys.map(Number)),
        }}
      />
      <AddOnTable shopId={shopId} shortages={shortages} fetchShortages={fetchShortages} supplierNames={supplierNames} />
    </>
  ) : (
    <></>
  );
};
