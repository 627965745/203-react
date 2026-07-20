import React, { useState, useEffect } from "react";
import { Modal, Form, Button, message, Space, Tag, Spin } from "antd";
import { ExperimentOutlined, UserOutlined } from "@ant-design/icons";
import { comboTestMethod } from "../../../api/testMethod";
import { methodTestItem } from "../../../api/testItem";
import MethodSelector from "../MethodSelector";

// V2: 「样品级 方法分派」配置。加工不再在此配置 —— 前处理/加工要求框已移除，
//     加工任务改为在“样品项目与生命周期管理”里，对已添加的方法卡片单独添加。
// V2: 分派检测方法挑选试验方法，支持从“检测项目关联的建议方法”或“全量方法”中多选。
const ItemConfigModal = ({
    visible,
    onClose,
    onSaveMethod,
    onDeleteMethod,
    disabled = false,
    sampleData, // V2: 携带样品的 items / methods
}) => {
    const [methodForm] = Form.useForm();

    const [loading, setLoading] = useState(false);
    const [testMethods, setTestMethods] = useState([]);
    const [suggestedMethods, setSuggestedMethods] = useState([]);
    const [suggestedLoading, setSuggestedLoading] = useState(false);

    const sampleItemIds = React.useMemo(
        () => (sampleData?.items || []).map(i => i.item_id || i.id),
        [sampleData]
    );

    useEffect(() => {
        if (visible) {
            fetchTestMethods();
            methodForm.resetFields();
        }
    }, [visible, methodForm]);

    const fetchTestMethods = async () => {
        setLoading(true);
        setSuggestedLoading(true);
        try {
            const [comboRes, suggestedRes] = await Promise.all([
                comboTestMethod(),
                sampleItemIds.length > 0 ? methodTestItem({ ids: sampleItemIds }) : Promise.resolve({ data: { data: [] } })
            ]);
            setTestMethods(comboRes.data?.data || []);
            setSuggestedMethods(suggestedRes.data?.data || []);
        } catch (error) {
            message.error("获取方法失败");
        } finally {
            setLoading(false);
            setSuggestedLoading(false);
        }
    };

    const handleSaveMethod = async () => {
        try {
            const values = await methodForm.validateFields();
            // V2: 样品级方法分派，支持一次选择多个方法，直接新增（不再替换）
            await onSaveMethod(values);
            methodForm.resetFields();
        } catch (error) {
            // Validation failed or API error
        }
    };

    // V2: 已分派方法读取样品级 methods
    const assignedMethods = sampleData?.methods || [];
    // 已分派的方法 id，避免在下拉里重复选择
    const assignedMethodIds = React.useMemo(
        () => assignedMethods.map(m => m.method_id || m.id),
        [assignedMethods],
    );

    return (
        <Modal
            title={
                <Space>
                    <span className="text-lg font-black text-slate-800">分派检测方法</span>
                    <span className="text-slate-400 font-mono text-sm">
                        {sampleData?.task_lab_code}-{sampleData?.lab_code?.toString().padStart(4, '0')}
                    </span>
                </Space>
            }
            open={visible}
            onCancel={onClose}
            footer={null}
            centered
            width={800}
            destroyOnClose
        >
            <div className="py-4">
                {/* V2: 仅保留方法分派；加工配置框已移除 */}
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <div className="text-sm font-black text-slate-700 flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                            <ExperimentOutlined />
                        </div>
                        <span>分派检测试验方法</span>
                    </div>

                    <Form form={methodForm} layout="vertical" disabled={disabled}>
                        {loading || suggestedLoading ? (
                            <div className="py-6 text-center"><Spin /></div>
                        ) : (
                            <Form.Item name="method_id" rules={[{ required: true, message: '请至少选择一个检测方法' }]} className="mb-0">
                                <MethodSelector
                                    suggestedMethods={suggestedMethods}
                                    allMethods={testMethods}
                                    disabledIds={assignedMethodIds}
                                />
                            </Form.Item>
                        )}
                        {!disabled && (
                            <div className="mt-4 flex justify-end">
                                <Button type="primary" onClick={handleSaveMethod} loading={loading}>
                                    分派选中的方法
                                </Button>
                            </div>
                        )}
                    </Form>

                    {assignedMethods.length > 0 && (
                        <div className="mt-6 border-t border-slate-200 pt-4">
                            <p className="text-[12px] text-slate-400 font-bold uppercase tracking-wider mb-3">已分派的方法列表 ({assignedMethods.length})</p>
                            <div className="space-y-3">
                                {assignedMethods.map(m => {
                                    const statusCfg = {
                                        0: { label: "管理组未下发", color: "default" },
                                        1: { label: "组长未下发", color: "blue" },
                                        2: { label: "正在试验", color: "orange" },
                                        3: { label: "等待组长审核", color: "cyan" },
                                        4: { label: "等待管理组审核", color: "purple" },
                                        5: { label: "生命周期结束", color: "green" },
                                    }[m.status] || { label: "未知状态", color: "default" };

                                    return (
                                        <div key={m.method_id || m.id} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm transition-all hover:shadow-md">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex flex-col gap-1">
                                                    <span className="font-bold text-slate-800 text-sm">{m.method_name || m.name}</span>
                                                    <div className="flex items-center gap-2">
                                                        <Tag color={statusCfg.color} className="m-0 text-[10px] border-none font-bold">
                                                            {statusCfg.label}
                                                        </Tag>
                                                        {m.department_name && (
                                                            <span className="text-[10px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                                                                {m.department_name}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="text-right flex flex-col items-end gap-1">
                                                    <span className="text-slate-500 font-mono text-[12px] font-bold">
                                                        {m.status === 0 ? '未下发（暂无期限）' : (m.test_deadline || '未设定完成期限')}
                                                    </span>
                                                    <span className="text-[11px] text-slate-500 uppercase tracking-tighter">完成期限</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-50">
                                                <div className="flex items-center gap-1.5 text-[13px] text-slate-600">
                                                    <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px]">
                                                        <UserOutlined />
                                                    </div>
                                                    <span className="font-medium">
                                                        {m.tester_name || (m.status === 0 ? '等待管理组下发' : (m.status === 1 ? '等待组长指派检测员' : '未指派'))}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
};

export default ItemConfigModal;
