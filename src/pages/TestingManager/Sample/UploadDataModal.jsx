import React, { useState } from "react";
import { Modal, Upload, message, Typography, Space } from "antd";
import { InboxOutlined, FileExcelOutlined } from "@ant-design/icons";
import { uploadTestingSample } from "../../../api/testing";

const { Dragger } = Upload;
const { Text } = Typography;

const UploadDataModal = ({ open, onCancel, onSuccess }) => {
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
            const res = await uploadTestingSample(formData);
            if (res.data.status === 0 || res.data.code === 0) {
                message.success("数据导入成功");
                onSuccess();
                onCancel();
                setFileList([]);
            } else {
                message.error(res.data.message || "导入失败");
            }
        } catch (error) {
            console.error("上传错误", error);
            message.error("上传文件失败");
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
                file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" || 
                file.type === "application/vnd.ms-excel" ||
                file.name.endsWith(".xlsx") ||
                file.name.endsWith(".xls");
            
            if (!isExcel) {
                message.error(`${file.name} 不是 Excel 文件`);
                return Upload.LIST_IGNORE;
            }
            
            setFileList([file]);
            return false; // Prevent automatic upload by antd
        },
        fileList,
        maxCount: 1,
    };

    return (
        <Modal
            title={
                <div className="flex items-center gap-3 p-1">
                    <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600">
                        <InboxOutlined />
                    </div>
                    <div>
                        <div className="text-lg font-black text-slate-800">上传检测数据</div>
                        <div className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">
                            Upload Testing Data
                        </div>
                    </div>
                </div>
            }
            open={open}
            onCancel={onCancel}
            onOk={handleUpload}
            okText="开始上传"
            cancelText="取消"
            confirmLoading={uploading}
            destroyOnClose
        >
            <div className="py-4">
                <Dragger {...props} className="bg-slate-50 border-dashed border-slate-300 rounded-lg p-6 hover:border-orange-500 transition-all">
                    <p className="ant-upload-drag-icon flex justify-center">
                        <FileExcelOutlined className="text-4xl text-orange-500" />
                    </p>
                    <p className="ant-upload-text font-bold text-slate-700 mt-2">点击或拖拽 Excel 文件到此区域进行上传</p>
                    <p className="ant-upload-hint text-xs text-slate-400 mt-1">
                        仅支持 .xlsx 或 .xls 格式的检测数据结果录入表
                    </p>
                </Dragger>
                {fileList.length > 0 && (
                    <div className="mt-4 p-3 bg-orange-50 rounded-xl border border-orange-100 flex items-center gap-3">
                        <FileExcelOutlined className="text-xl text-orange-600" />
                        <div className="flex-1 overflow-hidden">
                            <Text strong ellipsis className="block text-slate-800">{fileList[0].name}</Text>
                            <Text type="secondary" className="text-[12px] block text-slate-400">
                                {(fileList[0].size / 1024).toFixed(2)} KB
                            </Text>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default UploadDataModal;
