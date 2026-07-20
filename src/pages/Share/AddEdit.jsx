import { useState, useEffect } from "react";
import { Input, Space, Upload, Button, message } from "antd";
import { UploadOutlined, FileOutlined, LoadingOutlined } from "@ant-design/icons";
import { uploadFile } from "../../api/user";

const AddEdit = ({ record, onChange }) => {
    const [errors, setErrors] = useState({});
    const [uploading, setUploading] = useState(false);

    const validateInputs = () => {
        const newErrors = {};

        if (!record?.name || record.name.trim() === "") {
            newErrors.name = "文件名称不可为空";
        }
        if (!record?.url || record.url.trim() === "") {
            newErrors.url = "请先选择并上传文件";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    useEffect(() => {
        if (typeof onChange === "function") {
            onChange.validate = validateInputs;
        }
    }, [record, onChange]);

    const updateField = (field, value) => {
        onChange({ ...record, [field]: value });
        if (errors[field]) {
            setErrors({ ...errors, [field]: null });
        }
    };

    const handleUpload = async ({ file }) => {
        const formData = new FormData();
        formData.append("file", file);
        setUploading(true);
        try {
            const response = await uploadFile(formData);
            if (response.data.status === 0) {
                const filename = response.data.data;
                const fileUrl = `/uploads/${filename}`;
                
                const newRecord = {
                    ...record,
                    url: fileUrl,
                };
                // Auto-fill name if not already typed
                if (!record.name || record.name.trim() === "") {
                    newRecord.name = file.name;
                }
                onChange(newRecord);
                
                if (errors.url) {
                    setErrors({ ...errors, url: null });
                }
                message.success("文件上传成功");
            } else {
                message.error(response.data.message || "上传文件失败");
            }
        } catch (error) {
            console.error("File upload error:", error);
            message.error(error.response?.data?.message || "上传文件出错");
        } finally {
            setUploading(false);
        }
    };

    return (
        <Space direction="vertical" className="w-full" size="middle">
            <div>
                <div className="mb-2 font-bold text-slate-700">文件显示名称 <span className="text-red-500">*</span></div>
                <Input
                    placeholder="请输入文件显示名称"
                    value={record.name || ""}
                    onChange={(e) => updateField("name", e.target.value)}
                    status={errors.name ? "error" : ""}
                    maxLength={255}
                />
                {errors.name && <div className="text-red-500 text-sm mt-1">{errors.name}</div>}
            </div>

            <div>
                <div className="mb-2 font-bold text-slate-700">文件链接 (URL) <span className="text-red-500">*</span></div>
                <div className="flex gap-2">
                    <Input
                        placeholder="上传后自动填充，也可直接粘贴链接"
                        value={record.url || ""}
                        onChange={(e) => updateField("url", e.target.value)}
                        status={errors.url ? "error" : ""}
                        maxLength={1000}
                    />
                    <Upload
                        customRequest={handleUpload}
                        showUploadList={false}
                        beforeUpload={() => true}
                    >
                        <Button 
                            icon={uploading ? <LoadingOutlined /> : <UploadOutlined />} 
                            loading={uploading}
                            className="rounded-lg font-semibold"
                        >
                            上传
                        </Button>
                    </Upload>
                </div>
                {errors.url && <div className="text-red-500 text-sm mt-1">{errors.url}</div>}
            </div>
        </Space>
    );
};

export default AddEdit;
