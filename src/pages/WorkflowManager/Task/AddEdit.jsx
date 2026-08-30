import { useState, useEffect } from "react";
import { Input, Space, Select, message, DatePicker, Row, Col, Radio } from "antd";
import dayjs from "dayjs";
import { comboClient } from "../../../api/client";
import { comboTaskType } from "../../../api/taskType";
import { comboAnalysisType } from "../../../api/analysisType";
import { comboUser } from "../../../api/user";

const { TextArea } = Input;

const AddEdit = ({ record, onChange }) => {
    const [errors, setErrors] = useState({});
    const [options, setOptions] = useState({
        clients: [],
        sampleTypes: [],
        analysisTypes: [],
        users: []
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchOptions = async () => {
            setLoading(true);
            try {
                const [clientsRes, typesRes, analysisRes, usersRes] = await Promise.all([
                    comboClient(),
                    comboTaskType(),
                    comboAnalysisType(),
                    comboUser()
                ]);

                setOptions({
                    clients: clientsRes.data.data || [],
                    sampleTypes: typesRes.data.data || [],
                    analysisTypes: analysisRes.data.data || [],
                    users: usersRes.data.data || []
                });
            } catch (err) {
                message.error("获取选项失败");
            } finally {
                setLoading(false);
            }
        };
        fetchOptions();
    }, []);

    const validateInputs = () => {
        const newErrors = {};

        if (!record?.name || record.name.trim() === "") {
            newErrors.name = "任务名称不可为空";
        }
        if (!record?.client_id) {
            newErrors.client_id = "请选择客户";
        }
        if (!record?.sample_type_id) {
            newErrors.sample_type_id = "请选择样品类型";
        }
        if (!record?.analysis_type_id) {
            newErrors.analysis_type_id = "请选择分析类型";
        }
        if (!record?.deadline) {
            newErrors.deadline = "请选择最迟完成日期";
        }
        if (!record?.receiver_id) {
            newErrors.receiver_id = "请选择收样人";
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
        <Space direction="vertical" className="w-full" size="middle">
            <Row gutter={16}>
                <Col span={24}>
                    <div className="mb-1 text-sm font-medium text-gray-700">任务名称 <span className="text-red-500">*</span></div>
                    <Input
                        placeholder="请输入任务名称"
                        value={record.name || ""}
                        onChange={(e) => updateField("name", e.target.value)}
                        status={errors.name ? "error" : ""}
                        maxLength={255}
                    />
                    {errors.name && <div className="text-red-500 text-xs mt-1">{errors.name}</div>}
                </Col>
            </Row>

            <Row gutter={16}>
                <Col span={12}>
                    <div className="mb-1 text-sm font-medium text-gray-700">关联客户 <span className="text-red-500">*</span></div>
                    <Select
                        showSearch
                        className="w-full"
                        placeholder="请选择客户"
                        value={record.client_id}
                        onChange={(val) => updateField("client_id", val)}
                        status={errors.client_id ? "error" : ""}
                        loading={loading}
                        options={options.clients.map(c => ({ label: c.name, value: c.id }))}
                        filterOption={(input, option) =>
                            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                        }
                    />
                    {errors.client_id && <div className="text-red-500 text-xs mt-1">{errors.client_id}</div>}
                </Col>
                <Col span={12}>
                    <div className="mb-1 text-sm font-medium text-gray-700">收样人 <span className="text-red-500">*</span></div>
                    <Select
                        showSearch
                        className="w-full"
                        placeholder="请选择收样人"
                        value={record.receiver_id}
                        onChange={(val) => updateField("receiver_id", val)}
                        status={errors.receiver_id ? "error" : ""}
                        loading={loading}
                        options={options.users.map(u => ({ label: u.nickname || u.name, value: u.id }))}
                        filterOption={(input, option) =>
                            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                        }
                    />
                    {errors.receiver_id && <div className="text-red-500 text-xs mt-1">{errors.receiver_id}</div>}
                </Col>
            </Row>

            <Row gutter={16}>
                <Col span={12}>
                    <div className="mb-1 text-sm font-medium text-gray-700">联系人姓名</div>
                    <Input
                        placeholder="请输入联系人"
                        value={record.liaison_name || ""}
                        onChange={(e) => updateField("liaison_name", e.target.value)}
                    />
                </Col>
                <Col span={12}>
                    <div className="mb-1 text-sm font-medium text-gray-700">联系人电话</div>
                    <Input
                        placeholder="请输入联系电话"
                        value={record.liaison_contact || ""}
                        onChange={(e) => updateField("liaison_contact", e.target.value)}
                    />
                </Col>
            </Row>

            <Row gutter={16}>
                <Col span={12}>
                    <div className="mb-1 text-sm font-medium text-gray-700">样品类型 <span className="text-red-500">*</span></div>
                    <Select
                        className="w-full"
                        placeholder="请选择样品类型"
                        value={record.sample_type_id}
                        onChange={(val) => updateField("sample_type_id", val)}
                        status={errors.sample_type_id ? "error" : ""}
                        loading={loading}
                        options={options.sampleTypes.map(t => ({ label: t.name, value: t.id }))}
                    />
                    {errors.sample_type_id && <div className="text-red-500 text-xs mt-1">{errors.sample_type_id}</div>}
                </Col>
                <Col span={12}>
                    <div className="mb-1 text-sm font-medium text-gray-700">分析类型 <span className="text-red-500">*</span></div>
                    <Select
                        className="w-full"
                        placeholder="请选择分析类型"
                        value={record.analysis_type_id}
                        onChange={(val) => updateField("analysis_type_id", val)}
                        status={errors.analysis_type_id ? "error" : ""}
                        loading={loading}
                        options={options.analysisTypes.map(t => ({ label: t.name, value: t.id }))}
                    />
                    {errors.analysis_type_id && <div className="text-red-500 text-xs mt-1">{errors.analysis_type_id}</div>}
                </Col>
            </Row>

            <Row gutter={16}>
                <Col span={12}>
                    <div className="mb-1 text-sm font-medium text-gray-700">物理形态 <span className="text-red-500">*</span></div>
                    <Radio.Group 
                        value={record.physical_state} 
                        onChange={(e) => updateField("physical_state", e.target.value)}
                    >
                        <Radio value={0}>固态</Radio>
                        <Radio value={1}>液态</Radio>
                        <Radio value={2}>气态</Radio>
                    </Radio.Group>
                </Col>
                <Col span={12}>
                    <div className="mb-1 text-sm font-medium text-gray-700">检测类别 <span className="text-red-500">*</span></div>
                    {/* V6: 字段改名 category → commission_type（取值不变：0委托/1监督/2其他） */}
                    <Radio.Group 
                        value={record.commission_type} 
                        onChange={(e) => updateField("commission_type", e.target.value)}
                    >
                        <Radio value={0}>委托检测</Radio>
                        <Radio value={1}>监督检测</Radio>
                        <Radio value={2}>其他</Radio>
                    </Radio.Group>
                </Col>
            </Row>

            {/* V2: 移除“是否需要加工”—— 加工需求改由每个样品自行维护 processing_status */}
            <Row gutter={16}>
                <Col span={12}>
                    <div className="mb-1 text-sm font-medium text-gray-700">来样方式 <span className="text-red-500">*</span></div>
                    {/* V6: 字段改名 delivered_by → delivery_type（取值不变：0邮寄/1送检/2自采） */}
                    <Radio.Group
                        value={record.delivery_type}
                        onChange={(e) => updateField("delivery_type", e.target.value)}
                    >
                        <Radio value={0}>客户邮寄</Radio>
                        <Radio value={1}>客户送检</Radio>
                        <Radio value={2}>自采</Radio>
                    </Radio.Group>
                </Col>
            </Row>

            <Row gutter={16}>
                <Col span={12}>
                    <div className="mb-1 text-sm font-medium text-gray-700">最迟完成日期 <span className="text-red-500">*</span></div>
                    <DatePicker
                        className="w-full"
                        placeholder="请选择最迟完成日期"
                        value={record.deadline ? dayjs(record.deadline) : null}
                        onChange={(val) => updateField("deadline", val ? val.format("YYYY-MM-DD") : null)}
                        status={errors.deadline ? "error" : ""}
                        disabledDate={current => current && current < dayjs().startOf('day')}
                    />
                    {errors.deadline && <div className="text-red-500 text-xs mt-1">{errors.deadline}</div>}
                </Col>
            </Row>

            <Row gutter={16}>
                <Col span={24}>
                    <div className="mb-1 text-sm font-medium text-gray-700">备注描述</div>
                    <TextArea
                        placeholder="请输入任务详细描述"
                        value={record.description || ""}
                        onChange={(e) => updateField("description", e.target.value)}
                        rows={3}
                    />
                </Col>
            </Row>
        </Space>
    );
};

export default AddEdit;
