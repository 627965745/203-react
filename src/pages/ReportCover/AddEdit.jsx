import { useState, useEffect } from "react";
import { Input, Space } from "antd";

const AddEdit = ({ record, onChange }) => {
    const [errors, setErrors] = useState({});

    const validateInputs = () => {
        const newErrors = {};

        if (!record?.name || record.name.trim() === "") {
            newErrors.name = "模板名称不可为空";
        }
        if (!record?.template_file || record.template_file.trim() === "") {
            newErrors.template_file = "模板文件路径不可为空";
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

    return (
        <Space orientation="vertical" className="w-full" size="middle">
            <div>
                <div className="mb-2">模板名称 <span className="text-red-500">*</span></div>
                <Input
                    placeholder="请输入封面模板名称"
                    value={record.name || ""}
                    onChange={(e) => updateField("name", e.target.value)}
                    status={errors.name ? "error" : ""}
                    maxLength={255}
                />
                {errors.name && <div className="text-red-500 text-sm mt-1">{errors.name}</div>}
            </div>

            <div>
                <div className="mb-2">模板文件路径 <span className="text-red-500">*</span></div>
                <Input
                    placeholder="例如: /templates/report_cover_v1.docx"
                    value={record.template_file || ""}
                    onChange={(e) => updateField("template_file", e.target.value)}
                    status={errors.template_file ? "error" : ""}
                    maxLength={255}
                />
                <div className="text-xs text-gray-400 mt-1">请输入服务器端 Word 模板的完整路径</div>
                {errors.template_file && <div className="text-red-500 text-sm mt-1">{errors.template_file}</div>}
            </div>

            <div>
                <div className="mb-2">描述</div>
                <Input.TextArea
                    placeholder="请输入模板描述及使用说明"
                    value={record.description || ""}
                    onChange={(e) => updateField("description", e.target.value)}
                    maxLength={255}
                    rows={4}
                />
            </div>
        </Space>
    );
};

export default AddEdit;
