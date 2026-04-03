import { useState, useEffect } from "react";
import { Input, Space, Select, DatePicker, InputNumber } from "antd";
import dayjs from "dayjs";
import { comboDeviceCategory } from "../../api/deviceCategory";
import { comboUser } from "../../api/user";

const AddEdit = ({ record, onChange }) => {
    const [errors, setErrors] = useState({});
    const [categories, setCategories] = useState([]);
    const [users, setUsers] = useState([]);

    const validateInputs = () => {
        const newErrors = {};

        if (!record?.name || record.name.trim() === "") {
            newErrors.name = "设备名称不可为空";
        }
        if (!record?.category_id) {
            newErrors.category_id = "请选择设备分类";
        }
        if (!record?.maintainer_id) {
            newErrors.maintainer_id = "请选择维护人";
        }
        if (record?.calibration_interval === undefined || record?.calibration_interval === null) {
            newErrors.calibration_interval = "校准周期不可为空";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    useEffect(() => {
        if (typeof onChange === "function") {
            onChange.validate = validateInputs;
        }
    }, [record, onChange]);

    useEffect(() => {
        const fetchCombos = async () => {
            try {
                const [categoryRes, userRes] = await Promise.all([
                    comboDeviceCategory(),
                    comboUser()
                ]);
                if (categoryRes.data.status === 0 || categoryRes.data.code === 0) {
                    setCategories(categoryRes.data.data || []);
                }
                if (userRes.data.status === 0 || userRes.data.code === 0) {
                    setUsers(userRes.data.data || []);
                }
            } catch (error) {
                console.error("Error fetching combos:", error);
            }
        };
        fetchCombos();
    }, []);

    const handleChange = (field, value) => {
        onChange({ ...record, [field]: value });
        if (errors[field]) {
            setErrors({ ...errors, [field]: null });
        }
    };

    return (
        <Space orientation="vertical" className="w-full" size="large">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <div className="mb-2">设备分类 <span className="text-red-500">*</span></div>
                    <Select
                        className="w-full"
                        placeholder="请选择分类"
                        value={record.category_id}
                        onChange={(val) => handleChange("category_id", val)}
                        status={errors.category_id ? "error" : ""}
                        options={categories.map(c => ({ value: c.id, label: c.name }))}
                    />
                    {errors.category_id && <div className="text-red-500 text-sm mt-1">{errors.category_id}</div>}
                </div>
                <div>
                    <div className="mb-2">设备名称 <span className="text-red-500">*</span></div>
                    <Input
                        placeholder="请输入名称"
                        value={record.name || ""}
                        onChange={(e) => handleChange("name", e.target.value)}
                        status={errors.name ? "error" : ""}
                        maxLength={255}
                    />
                    {errors.name && <div className="text-red-500 text-sm mt-1">{errors.name}</div>}
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
                <div>
                    <div className="mb-2">供应商</div>
                    <Input
                        placeholder="供应商"
                        value={record.vendor || ""}
                        onChange={(e) => handleChange("vendor", e.target.value)}
                        maxLength={255}
                    />
                </div>
                <div>
                    <div className="mb-2">型号</div>
                    <Input
                        placeholder="型号"
                        value={record.model || ""}
                        onChange={(e) => handleChange("model", e.target.value)}
                        maxLength={255}
                    />
                </div>
                <div>
                    <div className="mb-2">校准周期 (天) <span className="text-red-500">*</span></div>
                    <InputNumber
                        className="w-full"
                        placeholder="周期"
                        value={record.calibration_interval}
                        onChange={(val) => handleChange("calibration_interval", val)}
                        status={errors.calibration_interval ? "error" : ""}
                        min={0}
                    />
                    {errors.calibration_interval && <div className="text-red-500 text-sm mt-1">{errors.calibration_interval}</div>}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <div className="mb-2">序列号</div>
                    <Input
                        placeholder="序列号"
                        value={record.serial || ""}
                        onChange={(e) => handleChange("serial", e.target.value)}
                        maxLength={255}
                    />
                </div>
                <div>
                    <div className="mb-2">出厂编号</div>
                    <Input
                        placeholder="出厂编号"
                        value={record.factory_code || ""}
                        onChange={(e) => handleChange("factory_code", e.target.value)}
                        maxLength={255}
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <div className="mb-2">资产编号</div>
                    <Input
                        placeholder="资产编号"
                        value={record.asset_code || ""}
                        onChange={(e) => handleChange("asset_code", e.target.value)}
                        maxLength={255}
                    />
                </div>
                <div>
                    <div className="mb-2">维护人 <span className="text-red-500">*</span></div>
                    <Select
                        className="w-full"
                        placeholder="请选择维护人"
                        value={record.maintainer_id}
                        onChange={(val) => handleChange("maintainer_id", val)}
                        status={errors.maintainer_id ? "error" : ""}
                        showSearch
                        optionFilterProp="label"
                        options={users.map(u => ({ value: u.id, label: u.name || u.nickname || u.username }))}
                    />
                    {errors.maintainer_id && <div className="text-red-500 text-sm mt-1">{errors.maintainer_id}</div>}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <div className="mb-2">出厂日期</div>
                    <DatePicker
                        className="w-full"
                        value={record.manufactured_at ? dayjs(record.manufactured_at) : null}
                        onChange={(date, dateString) => handleChange("manufactured_at", dateString)}
                    />
                </div>
                <div>
                    <div className="mb-2">启用日期</div>
                    <DatePicker
                        className="w-full"
                        value={record.commissioned_at ? dayjs(record.commissioned_at) : null}
                        onChange={(date, dateString) => handleChange("commissioned_at", dateString)}
                    />
                </div>
            </div>

            <div>
                <div className="mb-2">备注</div>
                <Input.TextArea
                    placeholder="请输入备注"
                    value={record.notes || ""}
                    onChange={(e) => handleChange("notes", e.target.value)}
                    rows={3}
                    maxLength={255}
                />
            </div>
        </Space>
    );
};

export default AddEdit;
