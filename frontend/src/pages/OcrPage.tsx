import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Upload, Button, Table, Message, Tooltip, Image, Spin } from "@arco-design/web-react";
import { useApi } from "../services/api";
import { OcrTask } from "../types/ocr";
import { Material } from "../types";
import { ColumnProps } from "@arco-design/web-react/es/Table";
import { useIsMobile, useWindowSize } from "../utils/responsive";
import { AxiosError } from "axios";
import Title from "@arco-design/web-react/es/Typography/title";
import { useNavigate } from "react-router-dom";

const OcrPage = () => {
  const shopId = 1; // TODO
  const api = useApi();
  const isMobile = useIsMobile();
  const w = useWindowSize();
  const navigate = useNavigate();
  const [activeTask, setActiveTask] = useState<OcrTask>();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([]);
  const [uploading, setUploading] = useState<boolean>(false);
  const polling = useRef<NodeJS.Timer>();

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

  const stopPolling = useCallback(() => {
    clearInterval(polling.current);
    polling.current = undefined;
  }, []);

  const fetchActiveTask = useCallback(async () => {
    const task = await api.getOcrTask(shopId);
    setActiveTask(task);
    if (task && task.status !== 0) {
      stopPolling();
    }
  }, [api, setActiveTask, stopPolling]);

  const startPolling = useCallback(() => {
    if (!polling.current) {
      polling.current = setInterval(fetchActiveTask, 6000);
    }
  }, [fetchActiveTask]);

  useEffect(() => {
    fetchActiveTask();
  }, [fetchActiveTask]);

  const ocrResultMaterials = useMemo(() => {
    if (!activeTask || activeTask.status !== 1) {
      return [];
    }
    return materials.filter((m) => activeTask?.material_ids?.includes(m.id));
  }, [activeTask, materials]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const { url, public_url } = await api.getOcrS3PresignedUrl(file.type.split("/")[1]);
      await fetch(url, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });
      await api.createOcrTask(shopId, public_url);
      await fetchActiveTask();
      startPolling();
    } catch (error) {
      const errMessage = ((error as AxiosError).response?.data as any).error as string;
      Message.error(`上传失败: ${errMessage || error}`);
    } finally {
      setUploading(false);
    }
  };

  const handleConsumeTask = async () => {
    await api.consumeOcrTask(shopId);
    setActiveTask(undefined);
  };

  const handleConfirm = async () => {
    await api.addShortage(shopId, selectedRowKeys);
    await handleConsumeTask();
    navigate("/");
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
      <Title heading={6}>报货单识别</Title>
      {!activeTask || !activeTask.id ? (
        <Spin dot tip="图片上传中..." style={isMobile ? { width: "100%" } : undefined} loading={uploading}>
          <div style={isMobile ? {} : { width: w.width / 3 }}>
            <Upload
              drag
              customRequest={({ file }: { file: File }) => handleUpload(file)}
              showUploadList={false}
              accept={"image/*"}
              tip="图片格式：png/jpeg"
              onDrop={(e) => {
                const uploadFile = e.dataTransfer.files[0];
                const fmt = uploadFile.type.split("/")[1];
                if (fmt !== "png" && fmt !== "jpeg") {
                  Message.info("不接受的文件类型，请选择png/jpeg格式的图片");
                  return;
                }
              }}
            ></Upload>
          </div>
        </Spin>
      ) : (
        <div style={isMobile ? {} : { display: "flex", gap: 60, flexDirection: "row" }}>
          <Spin dot tip="图像识别中" loading={activeTask.status === 0}>
            <Image
              src={activeTask?.result_image_url || activeTask?.image_url}
              alt="OCR Result"
              height={isMobile ? undefined : w.height - 160}
              width={isMobile ? w.width - 16 : undefined}
            />
          </Spin>
          <div>
            {activeTask.status === 2 ? (
              <div style={{ color: "red", fontSize: 16 }}>识别失败</div>
            ) : (
              <Table
                rowKey="id"
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
                scroll={isMobile ? undefined : { y: w.height - 240 }}
                loading={activeTask.status === 0}
              />
            )}
            {activeTask.status !== 0 && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  gap: 24,
                  justifyContent: isMobile ? "space-around" : "flex-start",
                  marginTop: 12,
                }}
              >
                <Button type="primary" onClick={handleConfirm} disabled={selectedRowKeys.length === 0}>
                  确认添加
                </Button>
                <Button type="secondary" onClick={handleConsumeTask}>
                  重新上传
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default OcrPage;
