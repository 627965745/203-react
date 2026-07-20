import { useState, useEffect } from "react";
import { Input, Space, Upload, Button, message } from "antd";
import { UploadOutlined, LoadingOutlined } from "@ant-design/icons";
import { uploadFile } from "../../api/user";

const AddEdit = ({ record, onChange }) => {
    const [errors, setErrors] = useState({});
    const [uploading, setUploading] = useState(false);

    const validateInputs = () => {
        const newErrors = {};

        if (!record?.name || record.name.trim() === "") {
            newErrors.name = "检测方法名称不可为空";
        }
        if (!record?.code || record.code.trim() === "") {
            newErrors.code = "国标代码不可为空";
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
                updateField("standard_file", `/uploads/${filename}`);
                message.success("标准文件上传成功");
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
        <Space orientation="vertical" className="w-full" size="middle">
            <div>
                <div className="mb-2">检测方法名称 <span className="text-red-500">*</span></div>
                <Input
                    placeholder="请输入检测方法名称"
                    value={record.name || ""}
                    onChange={(e) => updateField("name", e.target.value)}
                    status={errors.name ? "error" : ""}
                    maxLength={255}
                />
                {errors.name && <div className="text-red-500 text-sm mt-1">{errors.name}</div>}
            </div>

            <div>
                <div className="mb-2">国标代码 <span className="text-red-500">*</span></div>
                <Input
                    placeholder="例如: GB/T 12345-2023"
                    value={record.code || ""}
                    onChange={(e) => updateField("code", e.target.value)}
                    status={errors.code ? "error" : ""}
                    maxLength={255}
                />
                {errors.code && <div className="text-red-500 text-sm mt-1">{errors.code}</div>}
            </div>

            <div>
                <div className="mb-2">标准文件</div>
                <div className="flex gap-2">
                    <Input
                        placeholder="上传后自动填充，也可直接粘贴链接"
                        value={record.standard_file || ""}
                        onChange={(e) => updateField("standard_file", e.target.value)}
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
                            {record.standard_file ? "重新上传" : "上传"}
                        </Button>
                    </Upload>
                </div>
            </div>
        </Space>
    );
};

export default AddEdit;
