import React, { useEffect, useState } from "react";
import { Table, Button, Message, Tag, Space, Tooltip, Modal } from "@arco-design/web-react";
import { IconCheck } from "@arco-design/web-react/icon";
import { useApi } from "../services/api";
import { ShortageRecord } from "../types";
import { ColumnProps } from "@arco-design/web-react/es/Table";
import { useIsMobile } from "../utils/responsive";
import { AxiosError } from "axios";
import Title from "@arco-design/web-react/es/Typography/title";

const STATUS_MAP: Record<number, string> = {
  2: "待下单",
  3: "已下单",
};

const STATUS_COLOR: Record<number, string> = {
  2: "orange",
  3: "green",
};

export interface ShortageRecordWithSupplier extends ShortageRecord {
  suppliers: Record<string, string>;
}

const ShortageManagePage: React.FC = () => {
  const api = useApi();
  const isMobile = useIsMobile();
  const [shopId] = useState(1); // TODO: 从登录用户获取
  const [shortages, setShortages] = useState<ShortageRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([]);

  // 获取已提交的缺货登记
  const fetchShortages = async () => {
    setLoading(true);
    try {
      const data = await api.getShortageList(shopId, [2, 3]);
      const sorted = data.sort((a, b) => (a.status - b.status) * 10000 + b.time.localeCompare(a.time));
      const formated = sorted.map((s) => ({
        ...s,
        time: s.time?.replace("T", " ").replace(".000Z", ""),
        order_time: s.order_time?.replace("T", " ").replace(".000Z", ""),
      }));
      setShortages(formated);
    } catch (e) {
      Message.error("获取缺货列表失败。" + (e as AxiosError).message || "");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShortages();
    // eslint-disable-next-line
  }, []);

  // 供货表格相关
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

  const supplierColor = (priority: string) => {
    switch (priority) {
      case "a":
        return "green";
      case "b":
        return "blue";
      default:
        return "orange";
    }
  };
  const supplierColumns: ColumnProps[] = [
    {
      title: isMobile ? "原材料" : "原材料名称",
      dataIndex: "material.name",
      render: (name: string, record: ShortageRecord) => (
        <Tooltip content={record.material.search_key} trigger={isMobile ? "click" : "hover"} position="top">
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
  ].filter((c) => !isMobile || !["material.type", "material.search_key"].includes(c.dataIndex));

  const columns: ColumnProps[] = [
    {
      title: isMobile ? "原材料" : "原材料名称",
      dataIndex: "material.name",
      render: (name: string, record: ShortageRecord) => (
        <Tooltip content={record.material.search_key} trigger={isMobile ? "click" : "hover"} position="top">
          {record.material.priority > 0 ? <b>{name}</b> : name}
        </Tooltip>
      ),
    },
    {
      title: "类型",
      dataIndex: "material.type",
    },
    {
      title: "登记时间",
      dataIndex: "time",
    },
    {
      title: "下单时间",
      dataIndex: "order_time",
    },
    {
      title: "状态",
      dataIndex: "status",
      render: (status: number) => <Tag color={STATUS_COLOR[status]}>{STATUS_MAP[status]}</Tag>,
    },
  ].filter((c) => !isMobile || !["material.type", "order_time"].includes(c.dataIndex));

  return (
    <>
      {shortagesWithSupplier.length > 0 && (
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
        </>
      )}
      <Title heading={6}>历史记录</Title>
      <Table columns={columns} data={shortages} rowKey="id" loading={loading} pagination={false} />
    </>
  );
};

export default ShortageManagePage;
