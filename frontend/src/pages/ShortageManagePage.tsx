import React, { useEffect, useState } from "react";
import { Table, Button, Message, Tag, Space, Tooltip, Modal } from "@arco-design/web-react";
import { IconCheck } from "@arco-design/web-react/icon";
import { useApi } from "../services/api";
import { ShortageRecord } from "../types";
import { ColumnProps } from "@arco-design/web-react/es/Table";
import { useIsMobile } from "../utils/responsive";
import { AxiosError } from "axios";

const STATUS_MAP: Record<number, string> = {
  2: "待下单",
  3: "已下单",
};

const STATUS_COLOR: Record<number, string> = {
  2: "orange",
  3: "green",
};

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
      const data: ShortageRecord[] = await api.getShortageList(shopId, [2, 3]);
      setShortages(data.sort((a, b) => (a.status - b.status) * 10000 + b.time.localeCompare(a.time)));
    } catch (e) {
      Message.error("获取缺货管理列表失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShortages();
    // eslint-disable-next-line
  }, []);

  // 批量处理（将选中项状态改为已下单）
  const handleBatchOrder = async () => {
    if (selectedRowKeys.length === 0) return;
    Modal.confirm({
      title: "确认处理",
      content: `确定将选中的缺货登记标记为"已下单"吗？`,
      style: isMobile
        ? { top: 0, width: "100vw", maxWidth: "100vw", borderRadius: 0, padding: 12 }
        : {},
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

  const columns: ColumnProps[] = [
    {
      title: isMobile ? "原材料" : "原材料名称",
      dataIndex: "material.name",
      render: (name: string, record: ShortageRecord) => (
        <Tooltip content={record.material.search_key} trigger={isMobile ? "click" : "hover"} position="top">
          {record.material.priority > 0 ? <b>{name} *</b> : name}
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
  ].filter((c) => !isMobile || !["type", "time", "order_time"].includes(c.dataIndex));

  return (
    <>
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<IconCheck />} onClick={handleBatchOrder} disabled={selectedRowKeys.length === 0}>
          已下单
        </Button>
      </Space>
      <Table
        columns={columns}
        data={shortages}
        rowKey="id"
        loading={loading}
        rowSelection={{
          type: "checkbox",
          selectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys.map(Number)),
          checkboxProps: (record: ShortageRecord) => ({
            disabled: record.status !== 2, // 只允许处理“待处理”状态
          }),
        }}
        pagination={false}
      />
    </>
  );
};

export default ShortageManagePage;
