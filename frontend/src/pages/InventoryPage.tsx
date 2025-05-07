import React, { useState, useEffect } from "react";
import { Table, Button, Input, Select, Card, Typography, Space, Message, Dropdown, Menu } from "@arco-design/web-react";
import { IconSearch, IconUser } from "@arco-design/web-react/icon";
import { useApi } from "../services/api";
import StockAdjustmentModal from "../components/StockAdjustmentModal";
import { useAuth } from "react-oidc-context";
import "./InventoryPage.css";
import { useIsMobile } from "../utils/responsive";
import { ColumnProps } from "@arco-design/web-react/es/Table";
import { Material } from "../types";

const { Title } = Typography;
const Option = Select.Option;

const InventoryPage: React.FC = () => {
  const { user, removeUser } = useAuth();
  const signout = () => {
    removeUser();
    const logoutReturnUri = encodeURIComponent(window.location.origin);
    const clientId = encodeURIComponent(process.env.REACT_APP_COGNITO_CLIENT_ID || "");
    const logoutURI = `${process.env.REACT_APP_COGNITO_DOMAIN}/logout?client_id=${clientId}&logout_uri=${logoutReturnUri}`;
    window.location.href = logoutURI;
  };
  const api = useApi();
  const isMobile = useIsMobile();

  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined);
  const [types, setTypes] = useState<string[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [tableHeight, setTableHeight] = useState(400);

  useEffect(() => {
    function calcTableHeight() {
      // 你可以根据实际页面结构微调这些高度
      const headerHeight = isMobile ? 80 : 140; // header部分高度
      const toolbarHeight = 60; // 筛选栏高度
      const cardPadding = 32; // Card内外边距
      const modalReserve = 24; // 预留底部空间
      const total = window.innerHeight - headerHeight - toolbarHeight - cardPadding - modalReserve;
      setTableHeight(total > 200 ? total : 200); // 最小高度200
    }
    calcTableHeight();
    window.addEventListener("resize", calcTableHeight);
    return () => window.removeEventListener("resize", calcTableHeight);
  }, []);

  // TODO: 从登录用户中获取shopId列表，提供下拉选择框
  const shopId = 1;
  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await api.getStock(shopId);
      setMaterials(data);

      // 提取所有不重复的类型
      const uniqueTypes = Array.from(new Set(data.map((item: Material) => item.type)));
      setTypes(uniqueTypes as string[]);
    } catch (error) {
      console.error("获取库存数据失败:", error);
      Message.error("获取库存数据失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAdjustStock = (material: Material) => {
    setSelectedMaterial(material);
    setModalVisible(true);
  };

  const handleModalClose = () => {
    setModalVisible(false);
    setSelectedMaterial(null);
  };

  const handleAdjustSuccess = () => {
    setModalVisible(false);
    setSelectedMaterial(null);
    fetchData();
  };

  // 过滤数据
  const filteredData = materials
    .filter((item) => {
      const matchesSearch = item.name.includes(searchText) || item.search_key.includes(searchText);
      const matchesType = !typeFilter || item.type === typeFilter;
      return matchesSearch && matchesType;
    })
    .sort((a, b) => b.priority - a.priority);

  const columns: ColumnProps[] = [
    {
      title: "原材料名称",
      dataIndex: "name",
      key: "name",
      render: (name: string, record: any) => (record.priority > 0 ? <b>{name} *</b> : name),
    },
  ];
  if (!isMobile) {
    columns.push({
      title: "类型",
      dataIndex: "type",
      key: "type",
    });
  }
  columns.push(
    ...[
      {
        title: "库存数量",
        dataIndex: "stock",
        key: "stock",
        render: (stock: number, record: Material) => `${stock} ${record.unit}`,
      },
      {
        title: "操作",
        key: "operations",
        render: (_: any, record: Material) => (
          <Button type="primary" onClick={() => handleAdjustStock(record)}>
            校准库存
          </Button>
        ),
      },
    ]
  );

  const dropList = (
    <Menu>
      {/* <Menu.Item key="profile">
        <span>个人信息</span>
      </Menu.Item> */}
      <Menu.Item key="logout" onClick={signout}>
        <span>退出登录</span>
      </Menu.Item>
    </Menu>
  );

  return (
    <div className="inventory-root">
      <div className="inventory-header">
        <Title heading={4} className="inventory-title">
          智能库存管理系统
        </Title>
        <Dropdown droplist={dropList} position="br">
          <Button type="text" icon={<IconUser />}>
            {(user?.profile as any)["cognito:username"] || "用户"}
          </Button>
        </Dropdown>
      </div>
      <Card className="inventory-card">
        <Space className="inventory-toolbar">
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
            style={{ width: "100%", maxWidth: isMobile ? 160 : 300 }}
            prefix={<IconSearch />}
            allowClear
          />
        </Space>
        <Table
          columns={columns}
          data={filteredData}
          loading={loading}
          rowKey="material_id"
          pagination={false}
          className="inventory-table"
          scroll={{ y: tableHeight }}
        />
      </Card>
      <StockAdjustmentModal
        visible={modalVisible}
        material={selectedMaterial}
        onClose={handleModalClose}
        onSuccess={handleAdjustSuccess}
        api={api}
      />
    </div>
  );
};

export default InventoryPage;
// export default withAuthenticationRequired(InventoryPage);
