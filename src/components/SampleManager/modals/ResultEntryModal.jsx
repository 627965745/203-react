import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, InputNumber, DatePicker, Button, Space, message, Spin, Tag, Tooltip, Empty, Divider, Select, Switch } from 'antd';
import { 
    ExperimentOutlined, 
    DashboardOutlined,
    LinkOutlined, 
    LockOutlined, 
    ThunderboltOutlined, 
    CalculatorOutlined,
    SyncOutlined,
    SaveOutlined
} from '@ant-design/icons';
import { fieldTestMethod } from '../../../api/testMethod';
import { resultCreateTestingSample } from '../../../api/testing';
// V5: resultCreate 新增必填 device_id —— 设备下拉沿用现有设备管理接口
import { comboDevice } from '../../../api/device';
import dayjs from 'dayjs';
import axios from 'axios';
// V6: 只读态的「检测设备 / 实验时间」与审核界面共用同一展示件
import { ResultMetaRow, ResultFieldMetaTags, getResultMetaVariance } from '../ResultDetail';
// V6: 结果里的实验时间字段名在写入端/读取端拼写不一致，统一走该 helper 读取
import { getExperimentedAt } from '../../../utils';

// V3: item 与 method 强绑定，结果主键重新变为 (sample_id, item_id, field_id) —— 结果录入需要
//     带上 item_id（取自 methodData.item_id，即该方法在样品上所归属的检测项目）
const ResultEntryModal = ({ open, onCancel, onSuccess, methodId, methodName, methodData, sampleData, readOnly = false }) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [fields, setFields] = useState([]);
    const [deviceLoading, setDeviceLoading] = useState({});
    // V5: 检测结果关联设备 —— resultCreate 的 device_id 为必填，本次录入的全部字段共用该设备
    const [devices, setDevices] = useState([]);
    const [devicesLoading, setDevicesLoading] = useState(false);
    const [deviceId, setDeviceId] = useState(null);
    const [deviceError, setDeviceError] = useState(false);
    // V6.1: 允许逐字段指定设备 —— 一次实验里不同结果字段可能出自不同仪器。
    //       关：全部字段共用上方那台设备（默认，绝大多数场景）；
    //       开：上方选择框变成"批量套用"，每个字段在自己下面单独选设备。
    const [perFieldDevice, setPerFieldDevice] = useState(false);
    const [fieldDeviceIds, setFieldDeviceIds] = useState({}); // { [fieldId]: deviceId }
    const [fieldDeviceErrors, setFieldDeviceErrors] = useState({});
    // V6: resultCreate 新增必填 experimented_at（实验时间，YYYY-MM-DD）——
    //     与设备一样，本次录入的全部字段共用同一个实验时间。
    const [experimentedAt, setExperimentedAt] = useState(null);
    const [experimentedAtError, setExperimentedAtError] = useState(false);

    useEffect(() => {
        if (open && methodId) {
            fetchFields();
        }
    }, [open, methodId]);

    // V5: 打开录入弹窗时加载设备下拉；只读查看态不需要选设备
    useEffect(() => {
        if (!open || readOnly) return;
        setDeviceId(null);
        setDeviceError(false);
        setPerFieldDevice(false);
        setFieldDeviceIds({});
        setFieldDeviceErrors({});
        // V6: 实验时间默认取今天，多数场景下"当天做的实验当天录入"，省一次选择
        setExperimentedAt(dayjs());
        setExperimentedAtError(false);
        setDevicesLoading(true);
        comboDevice({})
            .then((res) => {
                const raw = res.data?.data;
                setDevices(Array.isArray(raw) ? raw : raw?.rows || []);
            })
            .catch(() => setDevices([]))
            .finally(() => setDevicesLoading(false));
    }, [open, readOnly]);

    const fetchFields = async () => {
        setLoading(true);
        try {
            const res = await fieldTestMethod({ id: methodId });
            if (res.data.status === 0) {
                const sortedFields = (res.data.data || []).sort((a, b) => a.sort - b.sort);
                setFields(sortedFields);
                
                // Initialize form with mapped, fixed, or existing result values
                const initialValues = {};
                sortedFields.forEach(f => {
                    let val = null;
                    
                    // 1. Check if there's an existing result already saved
                    const existingResult = methodData?.results?.find(r => 
                        r.field_id === f.id || r.name === f.name
                    );
                    
                    if (existingResult) {
                        val = existingResult.value;
                    } else if (f.source_type === 1) { // 2. Mapped from Sample Input
                        const mappedInput = sampleData?.inputs?.find(i => i.key === f.input_mapped_from);
                        val = mappedInput ? mappedInput.value : null;
                    } else if (f.source_type === 2) { // 3. Fixed Value
                        val = f.fixed_value;
                    }

                    // Handle data type conversion (e.g. for DatePicker)
                    if (val !== null && val !== undefined) {
                        if (f.data_type === 2) { // Date
                            initialValues[f.key] = dayjs(val);
                        } else if (f.data_type === 1) { // Number
                            initialValues[f.key] = Number(val);
                        } else {
                            initialValues[f.key] = val;
                        }
                    }
                });
                form.setFieldsValue(initialValues);

                // V5: 已保存过的结果会带上 device_id —— 重新打开录入弹窗时回填上次使用的设备，
                //     免得每次修改结果都要重新选一遍。只读查看态不需要。
                if (!readOnly) {
                    const savedResults = methodData?.results || [];
                    // V6.1: 逐字段回填已保存的设备。各字段设备不一致时自动切到逐字段模式，
                    //       否则用户一保存就会把它们统一覆盖掉。
                    const byField = {};
                    sortedFields.forEach(f => {
                        const hit = savedResults.find(r => r.field_id === f.id || r.name === f.name);
                        if (hit?.device_id) byField[f.id] = hit.device_id;
                    });
                    const savedDeviceIds = [...new Set(Object.values(byField))];
                    setFieldDeviceIds(byField);
                    setPerFieldDevice(savedDeviceIds.length > 1);
                    const prevDevice = savedDeviceIds.length === 1 ? savedDeviceIds[0] : null;
                    if (prevDevice) setDeviceId(prevDevice);
                    // V6: 已保存过的结果会带上实验时间 —— 回填上次录入的日期，
                    //     避免修改结果时把它改成"今天"。读取走 getExperimentedAt：
                    //     后端 read 响应实际返回的是 exprimented_at（少一个 e）。
                    const prevExperimentedAt = (methodData?.results || [])
                        .map(getExperimentedAt)
                        .find(Boolean);
                    if (prevExperimentedAt) setExperimentedAt(dayjs(prevExperimentedAt));
                }
            }
        } catch (error) {
            message.error("加载方法字段失败");
        } finally {
            setLoading(false);
        }
    };

    const handleFetchDeviceData = async (field) => {
        if (readOnly) return;
        setDeviceLoading(prev => ({ ...prev, [field.key]: true }));
        try {
            const res = await axios.get(field.device_api);
            let value = typeof res.data === 'object' ? (res.data.value || res.data.data) : res.data;
            
            if (field.data_type === 2 && value) {
                value = dayjs(value);
            } else if (field.data_type === 1 && value) {
                value = Number(value);
            }

            form.setFieldsValue({ [field.key]: value });
            message.success(`已从设备采集数据: ${value}`);
        } catch (error) {
            message.error("设备采集失败: " + error.message);
        } finally {
            setDeviceLoading(prev => ({ ...prev, [field.key]: false }));
        }
    };

    const onFinish = async (values) => {
        if (readOnly) return;
        // V5: device_id 是 resultCreate 的必填项，缺失时后端会以参数校验错误(status=10)拒绝，
        //     这里先在前端拦下并给出定位明确的提示。
        // V6.1: 逐字段模式下改为校验每个字段各自的设备；统一模式下仍只校验上方那台。
        if (perFieldDevice) {
            const missing = fields.filter(f => !fieldDeviceIds[f.id]);
            if (missing.length > 0) {
                setFieldDeviceErrors(Object.fromEntries(missing.map(f => [f.id, true])));
                message.warning(`还有 ${missing.length} 个字段未选择检测设备`);
                return;
            }
        } else if (!deviceId) {
            setDeviceError(true);
            message.warning("请先选择本次检测所用设备");
            return;
        }
        // V6: experimented_at 是 resultCreate 的必填项，缺失时后端会以参数校验错误(status=10)
        //     拒绝，这里先在前端拦下。
        if (!experimentedAt) {
            setExperimentedAtError(true);
            message.warning("请先选择本次实验时间");
            return;
        }
        setSubmitting(true);
        try {
            // Per the new requirement, we submit each field individually
            const requests = fields.map(f => {
                let val = values[f.key];
                
                // Format values based on type
                if (f.data_type === 2 && val) {
                    val = dayjs(val).format('YYYY-MM-DD');
                }
                
                return resultCreateTestingSample({
                    sample_id: sampleData.id,
                    // V3: 结果主键为 (sample_id, item_id, field_id)，需带上该方法所属的 item_id
                    item_id: methodData?.item_id,
                    field_id: f.id,
                    // V5: 新增必填 device_id —— 关联 devices 表，记录该结果由哪台设备产出
                    // V6.1: 逐字段模式下取该字段自己的设备
                    device_id: perFieldDevice ? fieldDeviceIds[f.id] : deviceId,
                    value: val != null ? String(val) : "",
                    // V6: 新增必填 experimented_at —— 实验时间（sample_results.experimented_at）
                    experimented_at: experimentedAt.format("YYYY-MM-DD")
                });
            });

            const results = await Promise.all(requests);
            
            // Check for any failures
            const errors = results.filter(r => r.data.status !== 0);
            
            if (errors.length === 0) {
                message.success("所有字段结果保存成功");
                onSuccess();
            } else {
                message.error(`部分字段保存失败 (${errors.length}/${fields.length})`);
            }
        } catch (error) {
            message.error("提交过程发生异常: " + (error.message || "未知错误"));
        } finally {
            setSubmitting(false);
        }
    };

    // V6: 只读查看态下，若整组结果的设备/实验时间不一致（Excel 批量导入可逐字段指定设备），
    //     方法级那一行只会显示"各字段不同"，需要在每个字段下面补上它自己的设备与时间，
    //     否则审核/查看的人看不到具体是哪台设备、哪一天做的。
    const metaVariance = getResultMetaVariance(methodData?.results || []);

    // V6: combo 返回的 name 已是「设备名称 (资产编号)」，前端不再自行拼接。
    //     设备目录里存在 name 为空的脏数据，回退成 #id 以免下拉里出现空白项。
    const deviceOptions = devices.map(d => ({
        label: d.name || `#${d.id}`,
        value: d.id
    }));

    const renderField = (field) => {
        const { source_type, data_type, is_required, name, key, device_api } = field;
        
        let inputComponent;
        const isDisabled = (source_type !== 0) || readOnly; // Only manual (0) is editable, and never in readOnly mode
        
        if (data_type === 1) { // Number
            inputComponent = <InputNumber className="w-full" style={{ width: "50%" }} disabled={isDisabled} placeholder="请输入数值" />;
        } else if (data_type === 2) { // Date
            inputComponent = <DatePicker className="w-full" style={{ width: "50%" }} disabled={isDisabled} placeholder="请选择日期" />;
        } else { // Text
            inputComponent = <Input.TextArea autoSize={{ minRows: 2, maxRows: 6 }} className="w-full" style={{ width: "100%" }} disabled={isDisabled} placeholder="请输入内容" />;
        }

        const indicators = [];
        if (source_type === 1) indicators.push(<Tag icon={<LinkOutlined />} color="blue" key="map" className="m-0 text-[10px]">参数引入</Tag>);
        if (source_type === 2) indicators.push(<Tag icon={<LockOutlined />} color="default" key="fixed" className="m-0 text-[10px]">固定值</Tag>);
        if (source_type === 3) indicators.push(<Tag icon={<ThunderboltOutlined />} color="warning" key="device" className="m-0 text-[10px]">设备采集</Tag>);
        if (source_type === 4) indicators.push(<Tag icon={<CalculatorOutlined />} color="purple" key="calc" className="m-0 text-[10px]">代码计算</Tag>);

        return (
            <Form.Item
                key={key}
                name={key}
                label={
                    <Space size={4}>
                        <span className="font-bold text-slate-700">{name}</span>
                        {indicators}
                    </Space>
                }
                rules={[{ required: is_required === 1 && !readOnly, message: `${name}是必填项` }]}
                // V6: 设备/实验时间逐字段不同时，在控件下方标注该字段自己的值。
                //     必须走 extra —— Form.Item 只会把 value/onChange 注入唯一的子节点，
                //     直接多塞一个兄弟节点会让绑定失效、已保存的结果显示为空。
                extra={
                    readOnly ? (
                        <ResultFieldMetaTags
                            result={(methodData?.results || []).find(
                                (r) => r.field_id === field.id || r.name === field.name
                            )}
                            showDevice={metaVariance.deviceVaries}
                            showDate={metaVariance.dateVaries}
                        />
                    ) : perFieldDevice ? (
                        // V6.1: 该字段自己的设备。放在 extra 里而不是当作 Form.Item 的第二个
                        //       子节点 —— 后者会打断 antd 的取值绑定，让已录入的值显示为空。
                        <div className="mt-1">
                            <Select
                                size="small"
                                className="w-full"
                                placeholder="该字段所用设备"
                                loading={devicesLoading}
                                value={fieldDeviceIds[field.id]}
                                onChange={(val) => {
                                    setFieldDeviceIds(prev => ({ ...prev, [field.id]: val }));
                                    setFieldDeviceErrors(prev => ({ ...prev, [field.id]: false }));
                                }}
                                status={fieldDeviceErrors[field.id] ? "error" : ""}
                                showSearch
                                optionFilterProp="label"
                                options={deviceOptions}
                                suffixIcon={<DashboardOutlined />}
                            />
                            {fieldDeviceErrors[field.id] && (
                                <div className="text-red-500 text-xs mt-1">请选择该字段所用设备</div>
                            )}
                        </div>
                    ) : null
                }
            >
                {source_type === 3 ? (
                    <div className="flex gap-2">
                        {inputComponent}
                        {!readOnly && (
                            <Tooltip title={`采集地址: ${device_api}`}>
                                <Button 
                                    icon={<SyncOutlined spin={deviceLoading[key]} />} 
                                    onClick={() => handleFetchDeviceData(field)}
                                    disabled={!device_api || readOnly}
                                    className="border-orange-200 text-orange-500 hover:text-orange-600 hover:border-orange-300"
                                >
                                    采集
                                </Button>
                            </Tooltip>
                        )}
                    </div>
                ) : inputComponent}
            </Form.Item>
        );
    };

    return (
        <Modal
            title={
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center">
                        <ExperimentOutlined className="text-orange-500" />
                    </div>
                    <div>
                        <div className="text-base font-black text-slate-800">
                            {readOnly ? '实验结果查看' : '实验结果录入'}
                        </div>
                        <div className="text-[10px] text-slate-400 font-normal">{methodName}</div>
                    </div>
                </div>
            }
            open={open}
            onCancel={onCancel}
            onOk={() => form.submit()}
            confirmLoading={submitting}
            width={600}
            destroyOnClose
            centered
            okText="提交结果"
            cancelText={readOnly ? "关闭" : "取消"}
            okButtonProps={readOnly ? { style: { display: 'none' } } : { 
                icon: <SaveOutlined />,
                className: "rounded-lg font-bold bg-orange-500 hover:bg-orange-600 border-none shadow-orange-100 shadow-lg"
            }}
            cancelButtonProps={{ className: "rounded-lg" }}
        >
            <Spin spinning={loading}>
                <div className="mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-black text-slate-400 uppercase tracking-wider">样品基本信息</span>
                        <Tag color={readOnly ? "cyan" : "orange"} className="m-0 border-none rounded-md px-2 text-[10px]">
                            {readOnly ? "已提交审核" : "实验进行中"}
                        </Tag>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col">
                            <span className="text-[10px] text-slate-400">实验室编号</span>
                            <span className="font-mono font-bold text-slate-700">{sampleData?.task_lab_code}-{sampleData?.lab_code?.toString().padStart(4, '0')}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] text-slate-400">客户样号</span>
                            <span className="font-bold text-slate-700">{sampleData?.client_code || '-'}</span>
                        </div>
                    </div>
                </div>

                {/* V5: 检测结果关联设备 —— resultCreate 的 device_id 为必填。
                    本次提交的所有字段共用这台设备（后端按字段逐条写入 sample_results.device_id）。 */}
                {/* V6: 新增实验时间 —— resultCreate 的 experimented_at 为必填，
                    与设备同样是"本次录入全部字段共用"，因此并排放在同一区块。 */}
                {!readOnly && (
                    <div className="mb-6 grid grid-cols-2 gap-4">
                        <div>
                            <div className="mb-2 flex items-center justify-between gap-2">
                                <Space size={4}>
                                    <span className="font-bold text-slate-700">检测设备</span>
                                    <span className="text-red-500">*</span>
                                    <Tag color="blue" className="m-0 text-[10px]">
                                        {perFieldDevice ? "批量套用" : "全字段共用"}
                                    </Tag>
                                </Space>
                                {/* V6.1: 一次实验里不同字段可能出自不同仪器 —— 打开后逐字段单独选 */}
                                <Tooltip title="打开后每个结果字段可以各自指定设备；关闭则全部字段共用上面这一台。">
                                    <label className="flex items-center gap-1.5 text-[11px] text-slate-500 cursor-pointer">
                                        <Switch
                                            size="small"
                                            checked={perFieldDevice}
                                            onChange={(checked) => {
                                                setPerFieldDevice(checked);
                                                setDeviceError(false);
                                                setFieldDeviceErrors({});
                                                // 打开时把当前这台预置到所有字段，多数情况下只需再改个别字段
                                                if (checked && deviceId) {
                                                    setFieldDeviceIds(
                                                        Object.fromEntries(fields.map(f => [f.id, deviceId]))
                                                    );
                                                }
                                            }}
                                        />
                                        逐字段指定
                                    </label>
                                </Tooltip>
                            </div>
                            <Select
                                className="w-full"
                                placeholder={perFieldDevice ? "选择后套用到全部字段" : "请选择本次检测所用设备"}
                                loading={devicesLoading}
                                value={deviceId}
                                onChange={(val) => {
                                    setDeviceId(val);
                                    setDeviceError(false);
                                    // 逐字段模式下，这里改的是"批量套用"，直接刷到每个字段上
                                    if (perFieldDevice) {
                                        setFieldDeviceIds(
                                            Object.fromEntries(fields.map(f => [f.id, val]))
                                        );
                                        setFieldDeviceErrors({});
                                    }
                                }}
                                status={deviceError ? "error" : ""}
                                showSearch
                                allowClear={perFieldDevice}
                                optionFilterProp="label"
                                options={deviceOptions}
                            />
                            {deviceError && (
                                <div className="text-red-500 text-sm mt-1">请选择检测设备</div>
                            )}
                        </div>
                        {/* V6: 实验时间（experimented_at），日期格式 YYYY-MM-DD */}
                        <div>
                            <div className="mb-2">
                                <Space size={4}>
                                    <span className="font-bold text-slate-700">实验时间</span>
                                    <span className="text-red-500">*</span>
                                    <Tag color="blue" className="m-0 text-[10px]">全字段共用</Tag>
                                </Space>
                            </div>
                            <DatePicker
                                className="w-full"
                                placeholder="请选择本次实验时间"
                                value={experimentedAt}
                                onChange={(val) => {
                                    setExperimentedAt(val);
                                    setExperimentedAtError(false);
                                }}
                                status={experimentedAtError ? "error" : ""}
                            />
                            {experimentedAtError && (
                                <div className="text-red-500 text-sm mt-1">请选择实验时间</div>
                            )}
                        </div>
                    </div>
                )}

                {/* V6: 只读查看态展示本次结果的检测设备(V5)与实验时间(V6)。
                    与录入态的设备/日期选择框位置一致，审核与查看两边看到的信息也就对齐了。 */}
                {readOnly &&
                    (methodData?.results || []).length > 0 &&
                    // 设备和时间都逐字段不同时 ResultMetaRow 返回 null，
                    // 外层的白底边框也要一起收掉，别留一个空盒子
                    !(metaVariance.deviceVaries && metaVariance.dateVaries) && (
                        <div className="mb-6 p-3 bg-white rounded-xl border border-slate-100">
                            <ResultMetaRow results={methodData.results} />
                        </div>
                    )}

                <Form
                    form={form}
                    layout="vertical"
                    onFinish={onFinish}
                    requiredMark={false}
                >
                    {fields.length > 0 ? (
                        <div className="grid grid-cols-1 gap-x-6">
                            {fields.map(f => renderField(f))}
                        </div>
                    ) : (
                        <div className="py-12 flex flex-col items-center justify-center text-slate-300">
                            <Empty description={<span className="text-slate-400">该方法未配置任何检测字段</span>} />
                        </div>
                    )}
                </Form>
            </Spin>
        </Modal>
    );
};

export default ResultEntryModal;
