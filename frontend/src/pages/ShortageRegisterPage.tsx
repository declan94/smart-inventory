import React, { useEffect, useState } from "react";
import { Table, Button, Modal, Message, Tag, Space } from "@arco-design/web-react";
import { IconPlus, IconDelete, IconCheck } from "@arco-design/web-react/icon";
import { useApi } from "../services/api";
import { Material, ShortageRecord } from "../types";
import ShortageSelectModal from "../components/ShortageSelectModal";

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
      const res = await api.getMaterials(shopId);
      setMaterials(res.data);
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
    } catch (e) {
      Message.error("登记失败");
    } finally {
      setModalLoading(false);
    }
  };

  // 删除未提交的缺货登记
  const handleDelete = async (id: number) => {
    Modal.confirm({
      title: "确认删除",
      content: "确定要删除该缺货登记吗？",
      onOk: async () => {
        try {
          await api.deleteShortage(id);
          Message.success("删除成功");
          fetchShortages();
        } catch (e) {
          Message.error("删除失败");
        }
      },
    });
  };

  // 批量提交
  const handleSubmit = async () => {
    Modal.confirm({
      title: "确认提交",
      content: "确定要提交所有待提交的缺货登记吗？提交后不可修改。",
      onOk: async () => {
        try {
          await api.submitShortage(shopId);
          Message.success("提交成功");
          fetchShortages();
        } catch (e) {
          Message.error("提交失败");
        }
      },
    });
  };

  const columns = [
    {
      title: "原材料名称",
      dataIndex: "material",
      render: (m: any) => m?.name || "-",
    },
    {
      title: "类型",
      dataIndex: "material",
      render: (m: any) => m?.type || "-",
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
      render: (_: any, record: any) =>
        record.status === 1 ? (
          <Button icon={<IconDelete />} status="danger" size="mini" onClick={() => handleDelete(record.id)}>
            删除
          </Button>
        ) : null,
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <h2>缺货登记</h2>
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<IconPlus />} onClick={() => setModalVisible(true)}>
          新增登记
        </Button>
        <Button
          type="outline"
          icon={<IconCheck />}
          onClick={handleSubmit}
          disabled={!shortages.some((s) => s.status === 1)}
        >
          提交全部
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
    </div>
  );
};

export default ShortageRegisterPage;
