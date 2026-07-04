import { useState, useEffect } from "react";
import { Input, Space, Select, message } from "antd";
import { comboTestCategory } from "../../api/testCategory";

const AddEdit = ({ record, onChange }) => {
    const [errors, setErrors] = useState({});
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchCategories = async () => {
            setLoading(true);
            try {
                const res = await comboTestCategory();
                if (res.data.status === 0) {
                    setCategories(res.data.data || []);
                }
            } catch (err) {
                message.error("获取检测类别失败");
            } finally {
                setLoading(false);
            }
        };
        fetchCategories();
    }, []);

    const validateInputs = () => {
        const newErrors = {};

        if (!record?.category_id) {
            newErrors.category_id = "关联类别不可为空";
        }
        if (!record?.name || record.name.trim() === "") {
            newErrors.name = "项目名称不可为空";
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
                <div className="mb-2">
                    关联检测类别 <span className="text-red-500">*</span>
                </div>
                <Select
                    className="w-full"
                    placeholder="请选择检测类别"
                    value={record.category_id}
                    onChange={(val) => updateField("category_id", val)}
                    status={errors.category_id ? "error" : ""}
                    loading={loading}
                    options={categories.map((c) => ({
                        label: c.name,
                        value: c.id,
                    }))}
                />
                {errors.category_id && (
                    <div className="text-red-500 text-sm mt-1">
                        {errors.category_id}
                    </div>
                )}
            </div>

            <div>
                <div className="mb-2">
                    项目名称 <span className="text-red-500">*</span>
                </div>
                <Input
                    placeholder="请输入检测项目名称"
                    value={record.name || ""}
                    onChange={(e) => updateField("name", e.target.value)}
                    status={errors.name ? "error" : ""}
                    maxLength={255}
                />
                {errors.name && (
                    <div className="text-red-500 text-sm mt-1">
                        {errors.name}
                    </div>
                )}
            </div>
        </Space>
    );
};

export default AddEdit;
