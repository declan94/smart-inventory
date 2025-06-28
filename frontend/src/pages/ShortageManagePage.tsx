import React, { useEffect, useState } from "react";
import { Table, Message, Tag, Tooltip } from "@arco-design/web-react";
import { useApi } from "../services/api";
import { ShortageRecord } from "../types";
import { ColumnProps } from "@arco-design/web-react/es/Table";
import { useIsMobile } from "../utils/responsive";
import { AxiosError } from "axios";
import Title from "@arco-design/web-react/es/Typography/title";
import { PendingOrderShortagesTable } from "./PendingOrderTable";
import { AddOnTable } from "./AddOnTable";

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

  const tipsForRow = (record: ShortageRecord) => {
    return (
      <>
        <div>{record.material.search_key}</div>
        <div> {record.material.comment}</div>
      </>
    );
  };
  const columns: ColumnProps[] = [
    {
      title: isMobile ? "原材料" : "原材料名称",
      dataIndex: "material.name",
      render: (name: string, record: ShortageRecord) => (
        <Tooltip content={tipsForRow(record)} trigger={isMobile ? "click" : "hover"} position="top">
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
      render: (t: string, record: ShortageRecord) => record.is_add_on ? "凑单": t,
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
      <PendingOrderShortagesTable shopId={shopId} shortages={shortages} fetchShortages={fetchShortages} />
      <Title heading={6}>历史记录</Title>
      <Table columns={columns} data={shortages} rowKey="id" loading={loading} pagination={false} />
    </>
  );
};

export default ShortageManagePage;
