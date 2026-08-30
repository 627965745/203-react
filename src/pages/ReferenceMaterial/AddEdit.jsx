import { useState, useEffect } from "react";
import { Input, Space, Select, InputNumber, DatePicker } from "antd";
import dayjs from "dayjs";
import { comboReferenceMaterialMediumType } from "../../api/referenceMaterialMediumType";
// V5: 浓度/不确定度是 0~1 float，改用「尾数 × 数量级」两段式输入，避免手敲 0.0000045
import ScientificInput from "../../components/ScientificInput";

// V5: category 语义变化 —— 0 标准溶液 / 1 基准试剂（原 0「标准物质」迁至 ReferenceSample）。
//     后端 update/prepare 的校验上限一度仍为 2，注解中已标注修复；前端一律只传 0/1。
const CategoryOptions = [
    { label: "标准溶液", value: 0 },
    { label: "基准试剂", value: 1 },
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
        if (
            record?.physical_state === undefined ||
            record?.physical_state === null
        ) {
            newErrors.physical_state = "请选择物理形态";
        }
        if (
            record?.specification === undefined ||
            record?.specification === null
        ) {
            newErrors.specification = "规格不可为空";
        }
        if (record?.remaining === undefined || record?.remaining === null) {
            newErrors.remaining = "余量不可为空";
        }
        if (
            record?.alert_threshold === undefined ||
            record?.alert_threshold === null
        ) {
            newErrors.alert_threshold = "报警阈值不可为空";
        }
        if (
            record?.unit === undefined ||
            record?.unit === null ||
            record?.unit.trim() === ""
        ) {
            newErrors.unit = "单位不可为空";
        }
        if (
            record?.medium_type_id === undefined ||
            record?.medium_type_id === null
        ) {
            newErrors.medium_type_id = "请选择介质类型";
        }
        // V5: lab_code 由可空改为必填
        if (!record?.lab_code || record.lab_code.trim() === "") {
            newErrors.lab_code = "试剂标签编码不可为空";
        }
        // V5: concentration / uncertainty 均为必填，且后端统一为 0~1 的 float
        if (
            record?.concentration === undefined ||
            record?.concentration === null
        ) {
            newErrors.concentration = "浓度不可为空";
        } else if (record.concentration < 0 || record.concentration > 1) {
            newErrors.concentration = "浓度需在 0~1 之间";
        }
        if (
            record?.uncertainty === undefined ||
            record?.uncertainty === null
        ) {
            newErrors.uncertainty = "不确定度不可为空";
        } else if (record.uncertainty < 0 || record.uncertainty > 1) {
            newErrors.uncertainty = "不确定度需在 0~1 之间";
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
                if (res.data.status === 0) {
                    setMediumOptions(
                        (res.data.data || []).map((item) => ({
                            label: item.name,
                            value: item.id,
                        })),
                    );
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
                    <div className="mb-2">
                        名称 <span className="text-red-500">*</span>
                    </div>
                    <Input
                        placeholder="请输入名称"
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
                <div>
                    <div className="mb-2">
                        分类 <span className="text-red-500">*</span>
                    </div>
                    <Select
                        className="w-full"
                        placeholder="请选择分类"
                        options={CategoryOptions}
                        value={record.category}
                        onChange={(val) => updateField("category", val)}
                        status={errors.category ? "error" : ""}
                    />
                    {errors.category && (
                        <div className="text-red-500 text-sm mt-1">
                            {errors.category}
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
                <div>
                    <div className="mb-2">
                        阶段 <span className="text-red-500">*</span>
                    </div>
                    <Select
                        className="w-full"
                        placeholder="请选择阶段"
                        options={StageOptions}
                        value={record.stage}
                        onChange={(val) => updateField("stage", val)}
                        status={errors.stage ? "error" : ""}
                    />
                    {errors.stage && (
                        <div className="text-red-500 text-sm mt-1">
                            {errors.stage}
                        </div>
                    )}
                </div>
                <div>
                    <div className="mb-2">
                        物理形态 <span className="text-red-500">*</span>
                    </div>
                    <Select
                        className="w-full"
                        placeholder="请选择物理形态"
                        options={PhysicalStateOptions}
                        value={record.physical_state}
                        onChange={(val) => updateField("physical_state", val)}
                        status={errors.physical_state ? "error" : ""}
                    />
                    {errors.physical_state && (
                        <div className="text-red-500 text-sm mt-1">
                            {errors.physical_state}
                        </div>
                    )}
                </div>
                <div>
                    <div className="mb-2">
                        介质类型 <span className="text-red-500">*</span>
                    </div>
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
                    {errors.medium_type_id && (
                        <div className="text-red-500 text-sm mt-1">
                            {errors.medium_type_id}
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
                {/* V5: 试剂标签编码(lab_code) 改为必填 */}
                <div>
                    <div className="mb-2">
                        试剂标签编码 <span className="text-red-500">*</span>
                    </div>
                    <Input
                        placeholder="试剂标签编码"
                        value={record.lab_code || ""}
                        onChange={(e) =>
                            updateField("lab_code", e.target.value)
                        }
                        status={errors.lab_code ? "error" : ""}
                        maxLength={255}
                    />
                    {errors.lab_code && (
                        <div className="text-red-500 text-sm mt-1">
                            {errors.lab_code}
                        </div>
                    )}
                </div>
                <div>
                    <div className="mb-2">样品编码</div>
                    <Input
                        placeholder="样品编码"
                        value={record.sample_code || ""}
                        onChange={(e) =>
                            updateField("sample_code", e.target.value)
                        }
                        maxLength={255}
                    />
                </div>
                <div>
                    <div className="mb-2">批号</div>
                    <Input
                        placeholder="批号"
                        value={record.batch_code || ""}
                        onChange={(e) =>
                            updateField("batch_code", e.target.value)
                        }
                        maxLength={255}
                    />
                </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
                <div>
                    <div className="mb-2">
                        单位 <span className="text-red-500">*</span>
                    </div>
                    <Input
                        placeholder="单位(g/mL等)"
                        value={record.unit || ""}
                        onChange={(e) => updateField("unit", e.target.value)}
                        status={errors.unit ? "error" : ""}
                        maxLength={50}
                    />
                    {errors.unit && (
                        <div className="text-red-500 text-sm mt-1">
                            {errors.unit}
                        </div>
                    )}
                </div>
                <div>
                    <div className="mb-2">
                        规格 <span className="text-red-500">*</span>
                    </div>
                    <InputNumber
                        className="w-full"
                        min={0}
                        placeholder="规格"
                        value={record.specification}
                        onChange={(val) => updateField("specification", val)}
                        status={errors.specification ? "error" : ""}
                    />
                    {errors.specification && (
                        <div className="text-red-500 text-sm mt-1">
                            {errors.specification}
                        </div>
                    )}
                </div>
                <div>
                    <div className="mb-2">
                        余量 <span className="text-red-500">*</span>
                    </div>
                    <InputNumber
                        className="w-full"
                        min={0}
                        placeholder="余量"
                        value={record.remaining}
                        onChange={(val) => updateField("remaining", val)}
                        status={errors.remaining ? "error" : ""}
                    />
                    {errors.remaining && (
                        <div className="text-red-500 text-sm mt-1">
                            {errors.remaining}
                        </div>
                    )}
                </div>
                <div>
                    <div className="mb-2">
                        报警阈值 <span className="text-red-500">*</span>
                    </div>
                    <InputNumber
                        className="w-full"
                        min={0}
                        placeholder="报警阈值"
                        value={record.alert_threshold}
                        onChange={(val) => updateField("alert_threshold", val)}
                        status={errors.alert_threshold ? "error" : ""}
                    />
                    {errors.alert_threshold && (
                        <div className="text-red-500 text-sm mt-1">
                            {errors.alert_threshold}
                        </div>
                    )}
                </div>
            </div>

            {/* V5: 删除 质量浓度(mass_concentration) / 介质浓度(medium_concentration)；
                新增必填 浓度(concentration)，不确定度(uncertainty) 也改为必填。
                两者都是 0~1 的 float（最多 8 位小数），用「尾数 × 数量级」两段式录入，
                右侧下拉是 10 的负幂次，不是数据里的 unit 计量单位。 */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <div className="mb-2">
                        浓度 <span className="text-red-500">*</span>
                    </div>
                    {/* 「实际值」提示由 ScientificInput 统一渲染（showActual），
                        与调配录入、成分含量表保持一致 */}
                    <ScientificInput
                        value={record.concentration}
                        onChange={(val) => updateField("concentration", val)}
                        status={errors.concentration ? "error" : ""}
                        placeholder="浓度"
                        showActual
                    />
                    {errors.concentration && (
                        <div className="text-red-500 text-sm mt-1">
                            {errors.concentration}
                        </div>
                    )}
                </div>
                <div>
                    <div className="mb-2">
                        不确定度 <span className="text-red-500">*</span>
                    </div>
                    <ScientificInput
                        value={record.uncertainty}
                        onChange={(val) => updateField("uncertainty", val)}
                        status={errors.uncertainty ? "error" : ""}
                        placeholder="相对扩展不确定度"
                        showActual
                    />
                    {errors.uncertainty && (
                        <div className="text-red-500 text-sm mt-1">
                            {errors.uncertainty}
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
                <div>
                    <div className="mb-2">存放地点</div>
                    <Input
                        placeholder="存放地点"
                        value={record.location || ""}
                        onChange={(e) =>
                            updateField("location", e.target.value)
                        }
                        maxLength={255}
                    />
                </div>
                <div>
                    <div className="mb-2">定值日期</div>
                    <DatePicker
                        className="w-full"
                        placeholder="定值日期"
                        value={
                            record.confirmed_at
                                ? dayjs(record.confirmed_at)
                                : null
                        }
                        onChange={(date, dateString) =>
                            updateField("confirmed_at", dateString)
                        }
                    />
                </div>
                <div>
                    <div className="mb-2">有效期至</div>
                    <DatePicker
                        className="w-full"
                        placeholder="有效期至"
                        value={
                            record.expiring_at
                                ? dayjs(record.expiring_at)
                                : null
                        }
                        onChange={(date, dateString) =>
                            updateField("expiring_at", dateString)
                        }
                        disabledDate={(current) =>
                            current && current < dayjs().startOf("day")
                        }
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
