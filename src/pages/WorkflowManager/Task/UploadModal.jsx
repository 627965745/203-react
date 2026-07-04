import { useState } from "react";
import { Modal, Upload, message, Typography } from "antd";
import { InboxOutlined, FileExcelOutlined } from "@ant-design/icons";
import { uploadTask } from "../../../api/workflow";

const { Dragger } = Upload;
const { Text } = Typography;

const UploadModal = ({ visible, onCancel, onSuccess }) => {
    const [fileList, setFileList] = useState([]);
    const [uploading, setUploading] = useState(false);

    const handleUpload = async () => {
        if (fileList.length === 0) {
            message.warning("请先选择或拖拽文件");
            return;
        }

        const formData = new FormData();
        formData.append("file", fileList[0]);

        setUploading(true);
        try {
            const res = await uploadTask(formData);
            if (res.data.status === 0) {
                message.success("任务导入成功");
                onSuccess();
                onCancel();
                setFileList([]);
            } else {
                message.error(res.data.message || "导入失败");
            }
        } catch (error) {
            console.error("Upload error", error);
        } finally {
            setUploading(false);
        }
    };

    const props = {
        onRemove: () => {
            setFileList([]);
        },
        beforeUpload: (file) => {
            const isExcel =
                file.type ===
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
                file.type === "application/vnd.ms-excel" ||
                file.name.endsWith(".xlsx") ||
                file.name.endsWith(".xls");

            if (!isExcel) {
                message.error(`${file.name} 不是 Excel 文件`);
                return Upload.LIST_IGNORE;
            }

            setFileList([file]);
            return false; // Prevent automatic upload
        },
        fileList,
        maxCount: 1,
    };

    return (
        <Modal
            title="导入任务"
            open={visible}
            onCancel={onCancel}
            onOk={handleUpload}
            okText="开始导入"
            cancelText="取消"
            confirmLoading={uploading}
            destroyOnClose
        >
            <div className="py-4">
                <Dragger
                    {...props}
                    className="bg-slate-50 border-dashed border-slate-300 rounded-lg"
                >
                    <p className="ant-upload-drag-icon">
                        <FileExcelOutlined className="text-blue-500" />
                    </p>
                    <p className="ant-upload-text">
                        点击或拖拽 Excel 文件到此区域进行上传
                    </p>
                    <p className="ant-upload-hint text-xs">
                        仅支持 .xlsx 或 .xls 格式的任务导入模板
                    </p>
                </Dragger>
                {fileList.length > 0 && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-md border border-blue-100 flex items-center gap-2">
                        <FileExcelOutlined className="text-blue-500" />
                        <div className="flex-1 overflow-hidden">
                            <Text strong ellipsis className="block">
                                {fileList[0].name}
                            </Text>
                            <Text type="secondary" className="text-[12px]">
                                {(fileList[0].size / 1024).toFixed(2)} KB
                            </Text>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default UploadModal;
