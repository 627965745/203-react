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
        const rawFile = fileList[0]?.originFileObj || fileList[0];
        formData.append("file", rawFile);

        setUploading(true);
        try {
            const res = await uploadTask(formData);
            if (res.data.status === 0) {
                // V4: 样品插入改为 INSERT IGNORE —— 同一任务下 client_code 已存在时不再报错，
                //     后端会更新该样品的自定义输入项与检测方法，提示文案同步说明这一点。
                message.success("任务导入成功；已存在的样品已更新其参数与检测方法");
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
            title="导入送样单"
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
                    {/* V4: 重复 client_code 由报错改为更新已有样品 */}
                    <p className="ant-upload-hint text-xs">
                        同一任务下客户样号已存在时不会报错，将更新该样品的参数与检测方法
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
