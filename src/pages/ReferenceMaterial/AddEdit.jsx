import { useState, useEffect } from "react";
import { Input, Space, Select, InputNumber, DatePicker } from "antd";
import dayjs from "dayjs";
import { comboReferenceMaterialMediumType } from "../../api/referenceMaterialMediumType";

const CategoryOptions = [
    { label: "标准物质", value: 0 },
    { label: "标准溶液", value: 1 },
    { label: "基准试剂", value: 2 },
];

const StageOptions = [
    { label: "原液", value: 0 },
    { label: "中间液", value: 1 },
    { label: "工作液", value: 2 },
    { label: "标准曲线", value: 3 },
];

const PhysicalStateOptions = [
    { label: "固态", value: 0 },
    { label: "液态", value: 1 },
    { label: "气态", value: 2 },
];

const AddEdit = ({ record, onChange }) => {
    const [errors, setErrors] = useState({});
    const [mediumOptions, setMediumOptions] = useState([]);
    const [loading, setLoading] = useState(false);

    const validateInputs = () => {
        const newErrors = {};

        if (!record?.name || record.name.trim() === "") {
            newErrors.name = "名称不可为空";
        }
        if (record?.category === undefined || record?.category === null) {
            newErrors.category = "请选择分类";
        }
        if (record?.stage === undefined || record?.stage === null) {
            newErrors.stage = "请选择阶段";
        }
        if (record?.physical_state === undefined || record?.physical_state === null) {
            newErrors.physical_state = "请选择物理形态";
        }
        if (record?.specification === undefined || record?.specification === null) {
            newErrors.specification = "规格不可为空";
        }
        if (record?.remaining === undefined || record?.remaining === null) {
            newErrors.remaining = "余量不可为空";
        }
        if (record?.alert_threshold === undefined || record?.alert_threshold === null) {
            newErrors.alert_threshold = "报警阈值不可为空";
        }
        if (record?.unit === undefined || record?.unit === null || record?.unit.trim() === "") {
            newErrors.unit = "单位不可为空";
        }
        if (record?.medium_type_id === undefined || record?.medium_type_id === null) {
            newErrors.medium_type_id = "请选择介质类型";
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
        const fetchCombo = async () => {
            setLoading(true);
            try {
                const res = await comboReferenceMaterialMediumType({});
                if (res.data.status === 0 || res.data.code === 0) {
                    setMediumOptions((res.data.data || []).map(item => ({
                        label: item.name,
                        value: item.id
                    })));
                }
            } catch (error) {
                console.error("Fetch medium type error:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchCombo();
    }, []);

    const updateField = (field, value) => {
        onChange({ ...record, [field]: value });
        if (errors[field]) {
            setErrors({ ...errors, [field]: null });
        }
    };

    return (
        <Space orientation="vertical" className="w-full" size="middle">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <div className="mb-2">名称 <span className="text-red-500">*</span></div>
                    <Input
                        placeholder="请输入名称"
                        value={record.name || ""}
                        onChange={(e) => updateField("name", e.target.value)}
                        status={errors.name ? "error" : ""}
                        maxLength={255}
                    />
                    {errors.name && <div className="text-red-500 text-sm mt-1">{errors.name}</div>}
                </div>
                <div>
                    <div className="mb-2">分类 <span className="text-red-500">*</span></div>
                    <Select
                        className="w-full"
                        placeholder="请选择分类"
                        options={CategoryOptions}
                        value={record.category}
                        onChange={(val) => updateField("category", val)}
                        status={errors.category ? "error" : ""}
                    />
                    {errors.category && <div className="text-red-500 text-sm mt-1">{errors.category}</div>}
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
                <div>
                    <div className="mb-2">阶段 <span className="text-red-500">*</span></div>
                    <Select
                        className="w-full"
                        placeholder="请选择阶段"
                        options={StageOptions}
                        value={record.stage}
                        onChange={(val) => updateField("stage", val)}
                        status={errors.stage ? "error" : ""}
                    />
                    {errors.stage && <div className="text-red-500 text-sm mt-1">{errors.stage}</div>}
                </div>
                <div>
                    <div className="mb-2">物理形态 <span className="text-red-500">*</span></div>
                    <Select
                        className="w-full"
                        placeholder="请选择物理形态"
                        options={PhysicalStateOptions}
                        value={record.physical_state}
                        onChange={(val) => updateField("physical_state", val)}
                        status={errors.physical_state ? "error" : ""}
                    />
                    {errors.physical_state && <div className="text-red-500 text-sm mt-1">{errors.physical_state}</div>}
                </div>
                <div>
                    <div className="mb-2">介质类型 <span className="text-red-500">*</span></div>
                    <Select
                        className="w-full"
                        placeholder="请选择介质类型"
                        loading={loading}
                        options={mediumOptions}
                        value={record.medium_type_id}
                        onChange={(val) => updateField("medium_type_id", val)}
                        status={errors.medium_type_id ? "error" : ""}
                        showSearch
                        optionFilterProp="label"
                    />
                    {errors.medium_type_id && <div className="text-red-500 text-sm mt-1">{errors.medium_type_id}</div>}
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
                <div>
                    <div className="mb-2">试剂标签编码</div>
                    <Input
                        placeholder="试剂标签编码"
                        value={record.lab_code || ""}
                        onChange={(e) => updateField("lab_code", e.target.value)}
                        maxLength={255}
                    />
                </div>
                <div>
                    <div className="mb-2">样品编码</div>
                    <Input
                        placeholder="样品编码"
                        value={record.sample_code || ""}
                        onChange={(e) => updateField("sample_code", e.target.value)}
                        maxLength={255}
                    />
                </div>
                <div>
                    <div className="mb-2">批号</div>
                    <Input
                        placeholder="批号"
                        value={record.batch_code || ""}
                        onChange={(e) => updateField("batch_code", e.target.value)}
                        maxLength={255}
                    />
                </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
                <div>
                    <div className="mb-2">单位 <span className="text-red-500">*</span></div>
                    <Input
                        placeholder="单位(g/mL等)"
                        value={record.unit || ""}
                        onChange={(e) => updateField("unit", e.target.value)}
                        status={errors.unit ? "error" : ""}
                        maxLength={50}
                    />
                    {errors.unit && <div className="text-red-500 text-sm mt-1">{errors.unit}</div>}
                </div>
                <div>
                    <div className="mb-2">规格 <span className="text-red-500">*</span></div>
                    <InputNumber
                        className="w-full"
                        min={0}
                        placeholder="规格"
                        value={record.specification}
                        onChange={(val) => updateField("specification", val)}
                        status={errors.specification ? "error" : ""}
                    />
                    {errors.specification && <div className="text-red-500 text-sm mt-1">{errors.specification}</div>}
                </div>
                <div>
                    <div className="mb-2">余量 <span className="text-red-500">*</span></div>
                    <InputNumber
                        className="w-full"
                        min={0}
                        placeholder="余量"
                        value={record.remaining}
                        onChange={(val) => updateField("remaining", val)}
                        status={errors.remaining ? "error" : ""}
                    />
                    {errors.remaining && <div className="text-red-500 text-sm mt-1">{errors.remaining}</div>}
                </div>
                <div>
                    <div className="mb-2">报警阈值 <span className="text-red-500">*</span></div>
                    <InputNumber
                        className="w-full"
                        min={0}
                        placeholder="报警阈值"
                        value={record.alert_threshold}
                        onChange={(val) => updateField("alert_threshold", val)}
                        status={errors.alert_threshold ? "error" : ""}
                    />
                    {errors.alert_threshold && <div className="text-red-500 text-sm mt-1">{errors.alert_threshold}</div>}
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
                <div>
                    <div className="mb-2">不确定度(%)</div>
                    <InputNumber
                        className="w-full"
                        min={0}
                        max={100}
                        placeholder="相对扩展不确定度"
                        value={record.uncertainty}
                        onChange={(val) => updateField("uncertainty", val)}
                    />
                </div>
                <div>
                    <div className="mb-2">质量浓度(%)</div>
                    <InputNumber
                        className="w-full"
                        min={0}
                        max={100}
                        placeholder="质量浓度"
                        value={record.mass_concentration}
                        onChange={(val) => updateField("mass_concentration", val)}
                    />
                </div>
                <div>
                    <div className="mb-2">介质浓度(%)</div>
                    <InputNumber
                        className="w-full"
                        min={0}
                        max={100}
                        placeholder="介质浓度"
                        value={record.medium_concentration}
                        onChange={(val) => updateField("medium_concentration", val)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
                <div>
                    <div className="mb-2">存放地点</div>
                    <Input
                        placeholder="存放地点"
                        value={record.location || ""}
                        onChange={(e) => updateField("location", e.target.value)}
                        maxLength={255}
                    />
                </div>
                <div>
                    <div className="mb-2">定值日期</div>
                    <DatePicker
                        className="w-full"
                        placeholder="定值日期"
                        value={record.confirmed_at ? dayjs(record.confirmed_at) : null}
                        onChange={(date, dateString) => updateField("confirmed_at", dateString)}
                    />
                </div>
                <div>
                    <div className="mb-2">有效期至</div>
                    <DatePicker
                        className="w-full"
                        placeholder="有效期至"
                        value={record.expiring_at ? dayjs(record.expiring_at) : null}
                        onChange={(date, dateString) => updateField("expiring_at", dateString)}
                        disabledDate={current => current && current < dayjs().startOf('day')}
                    />
                </div>
            </div>

            <div>
                <div className="mb-2">研制单位</div>
                <Input
                    placeholder="研制单位"
                    value={record.vendor || ""}
                    onChange={(e) => updateField("vendor", e.target.value)}
                    maxLength={255}
                />
            </div>
        </Space>
    );
};

export default AddEdit;
