import React, { useEffect, useState } from "react";
import { Table, Button, Modal, Message, Tag, Space, Tooltip } from "@arco-design/web-react";
import { IconPlus, IconDelete, IconCheck, IconArrowUp, IconArrowDown, IconImage } from "@arco-design/web-react/icon";
import { useApi } from "../services/api";
import { Material, ShortageRecord } from "../types";
import ShortageSelectModal from "../components/ShortageSelectModal";
import { ColumnProps } from "@arco-design/web-react/es/Table";
import { useIsMobile } from "../utils/responsive";
import { AxiosError } from "axios";
import { useNavigate } from "react-router-dom";

const STATUS_MAP: Record<number, string> = {
  1: "待提交",
  2: "已提交",
};

const STATUS_COLOR: Record<number, string> = {
  1: "orange",
  2: "green",
};

const ShortageRegisterPage: React.FC = () => {
  const api = useApi();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [shopId] = useState(1); // TODO: 从登录用户获取
  const [shortages, setShortages] = useState<any[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);

  // 获取缺货登记列表
  const fetchShortages = async () => {
    setLoading(true);
    try {
      // status=1（待提交）和2（已提交）都查出来
      const shortages: ShortageRecord[] = await api.getShortageList(shopId, [1, 2]);
      setShortages(shortages.sort((a, b) => (a.status - b.status) * 10000 + b.time.localeCompare(a.time)));
    } catch (e) {
      Message.error("获取缺货登记失败");
    } finally {
      setLoading(false);
    }
  };

  // 获取原材料列表
  const fetchMaterials = async () => {
    try {
      const res = await api.getMaterials();
      setMaterials(res);
    } catch (e) {
      Message.error("获取原材料列表失败");
    }
  };

  useEffect(() => {
    fetchShortages();
    fetchMaterials();
    // eslint-disable-next-line
  }, []);

  // 新增缺货登记
  const handleBatchAddShortage = async (materialIds: number[]) => {
    setModalLoading(true);
    try {
      await api.addShortage(shopId, materialIds);
      Message.success("登记成功");
      fetchShortages();
      setModalVisible(false);
    } catch (error) {
      const errMessage = ((error as AxiosError).response?.data as any).error as string;
      if (errMessage) {
        Message.error({
          duration: 6000,
          content: errMessage,
        });
      } else {
        Message.error("登记失败，请重试。" + (error as AxiosError).message || "");
      }
    } finally {
      setModalLoading(false);
    }
  };

  // 删除未提交的缺货登记
  const handleDelete = async (record: ShortageRecord) => {
    Modal.confirm({
      title: "确认删除",
      content: "确定删除该缺货登记吗？",
      onOk: async () => {
        try {
          await api.deleteShortage(record.shop_id, record.id);
          Message.success("删除成功");
          fetchShortages();
        } catch (e) {
          Message.error("删除失败");
        }
      },
    });
  };

  // 更新优先级
  const handlePriorityChange = async (record: ShortageRecord, priority: number) => {
    try {
      await api.updateShortagePriority(record.shop_id, record.id, priority);
      Message.success("更新成功");
      fetchShortages();
    } catch (e) {
      Message.error("更新失败");
    }
  };

  // 批量提交
  const handleSubmit = async () => {
    Modal.confirm({
      title: "确认提交",
      content: "确定提交所有待提交的缺货登记吗？提交后不可修改。",
      style: isMobile ? { top: 0, width: "100vw", maxWidth: "100vw", borderRadius: 0, padding: 12 } : {},
      onOk: async () => {
        try {
          await api.submitShortage(shopId);
          Message.success("提交成功");
          fetchShortages();
        } catch (error) {
          const errMessage = ((error as AxiosError).response?.data as any).error as string;
          if (errMessage) {
            Message.error({
              duration: 6000,
              content: errMessage,
            });
          } else {
            Message.error("提交失败。" + (error as AxiosError).message || "");
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
          {record.material.priority > 0 ? <b>{name} *</b> : record.priority > 0 ? name + " *" : name}
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
      title: "状态",
      dataIndex: "status",
      render: (status: number) => <Tag color={STATUS_COLOR[status]}>{STATUS_MAP[status]}</Tag>,
    },
    {
      title: "操作",
      dataIndex: "id",
      render: (_: any, record: ShortageRecord) => {
        return (
          <>
            {record.status === 1 ? (
              <Button icon={<IconDelete />} status="danger" size="mini" onClick={() => handleDelete(record)}>
                删除
              </Button>
            ) : null}
            {record.status !== 3 && record.material.priority === 0 ? (
              record.priority === 0 ? (
                <Button
                  icon={<IconArrowUp />}
                  status="success"
                  size="mini"
                  onClick={() => handlePriorityChange(record, 1)}
                >
                  升级
                </Button>
              ) : (
                <Button
                  icon={<IconArrowDown />}
                  status="warning"
                  size="mini"
                  onClick={() => handlePriorityChange(record, 0)}
                >
                  降级
                </Button>
              )
            ) : null}
          </>
        );
      },
    },
  ].filter((c) => !isMobile || ["material.name", "status", "id"].includes(c.dataIndex));

  return (
    <>
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<IconPlus />} onClick={() => setModalVisible(true)}>
          新增
        </Button>
        <Button type="primary" icon={<IconImage />} onClick={() => navigate("/ocr")}>
          报货单
        </Button>
        <Button
          type="outline"
          icon={<IconCheck />}
          onClick={handleSubmit}
          disabled={!shortages.some((s) => s.status === 1)}
        >
          提交
        </Button>
      </Space>
      <Table columns={columns} data={shortages} rowKey="id" loading={loading} pagination={false} />
      <ShortageSelectModal
        visible={modalVisible}
        materials={materials}
        loading={modalLoading}
        onOk={handleBatchAddShortage}
        onCancel={() => setModalVisible(false)}
      />
    </>
  );
};

export default ShortageRegisterPage;
