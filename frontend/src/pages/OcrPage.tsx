import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Upload, Button, Table, Message, Tooltip } from "@arco-design/web-react";
import { useApi } from "../services/api";
import { OcrTask } from "../types/ocr";
import { Material } from "../types";
import { ColumnProps } from "@arco-design/web-react/es/Table";
import { useIsMobile } from "../utils/responsive";
import { AxiosError } from "axios";

const OcrPage = () => {
  const shopId = 1; // TODO
  const api = useApi();
  const isMobile = useIsMobile();
  const [activeTask, setActiveTask] = useState<OcrTask>();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([]);

  // 获取全部原材料列表
  const fetchMaterials = async () => {
    try {
      const res = await api.getMaterials();
      setMaterials(res);
    } catch (e) {
      Message.error("获取原材料列表失败");
    }
  };
  useEffect(() => {
    fetchMaterials();
    // eslint-disable-next-line
  }, []);

  const fetchActiveTask = useCallback(async () => {
    const task = await api.getOcrTask(shopId);
    setActiveTask(task);
  }, [api, setActiveTask]);

  useEffect(() => {
    fetchActiveTask();
    const interval = setInterval(fetchActiveTask, 10000);
    return () => clearInterval(interval);
  }, [fetchActiveTask]);

  const ocrResultMaterials = useMemo(() => {
    if (!activeTask || activeTask.status !== 1) {
      return [];
    }
    return materials.filter((m) => activeTask?.material_ids?.includes(m.id));
  }, [activeTask, materials]);

  const handleUpload = async (file: File) => {
    try {
      const { url, public_url } = await api.getOcrS3PresignedUrl(file.type.split("/")[1]);
      await fetch(url, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        }
      });
      await api.createOcrTask(shopId, public_url);
      fetchActiveTask();
    } catch (error) {
      const errMessage = ((error as AxiosError).response?.data as any).error as string;
      Message.error(`上传失败: ${errMessage || error}`);
    } finally {
    }
  };

  const handleConsumeTask = async () => {
    await api.consumeOcrTask(shopId);
    setActiveTask(undefined);
  };

  const handleConfirm = async () => {
    api.addShortage(shopId, selectedRowKeys).then(handleConsumeTask);
  };

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
    },
  ];

  return (
    <div>
      {!activeTask || !activeTask.id ? (
        <Upload customRequest={({ file }: { file: File }) => handleUpload(file)} showUploadList={false}>
          <Button type="primary">上传图片</Button>
        </Upload>
      ) : (
        <div>
          <img src={activeTask?.result_image_url || activeTask?.image_url} alt="OCR Result" />
          <Table
            data={ocrResultMaterials}
            columns={columns}
            rowSelection={{
              type: "checkbox",
              selectedRowKeys,
              onChange: (keys) => {
                setSelectedRowKeys(keys.map(Number));
              },
            }}
            pagination={false}
          />
          <Button onClick={handleConfirm}>确认添加</Button>
          <Button onClick={handleConsumeTask}>重新上传</Button>
        </div>
      )}
    </div>
  );
};

export default OcrPage;
