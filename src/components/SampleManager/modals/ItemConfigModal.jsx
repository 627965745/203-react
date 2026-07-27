import React, { useEffect } from "react";
import { Modal, Form, Button, Space, Tag } from "antd";
import { ExperimentOutlined, UserOutlined } from "@ant-design/icons";
import MethodSelector from "../MethodSelector";

// V2: 「样品级 方法分派」配置。加工不再在此配置 —— 前处理/加工要求框已移除，
//     加工任务改为在“样品项目与生命周期管理”里，对已添加的方法卡片单独添加。
// V3: item 与 method 强绑定 —— 不再有独立的"给样品加检测项目"操作，也不再有
//     "建议方法(来自样品已加项目)/全量方法"两栏拆分。改为直接在 MethodSelector
//     的 分类>项目>方法 级联里选择"检测项目+检测方法"组合，一次分派一个或多个
//     {item_id, method_id} 对（同一方法可挂在不同项目下重复出现，都是合法的独立组合）。
const ItemConfigModal = ({
    visible,
    onClose,
    onSaveMethod,
    onDeleteMethod,
    disabled = false,
    sampleData, // V3: 携带样品的 methods（每项已自带 item_id/item_name）
}) => {
    const [methodForm] = Form.useForm();

    useEffect(() => {
        if (visible) {
            methodForm.resetFields();
        }
    }, [visible, methodForm]);

    const handleSaveMethod = async () => {
        try {
            const values = await methodForm.validateFields();
            // V3: 支持一次选择多个 {item_id, method_id} 组合，直接新增（不再替换）
            await onSaveMethod(values);
            methodForm.resetFields();
        } catch (error) {
            // Validation failed or API error
        }
    };

    // V3: 已分派方法读取样品级 methods，每项自带 item_id/item_name
    const assignedMethods = sampleData?.methods || [];
    // 已分派的 {item_id, method_id} 组合键，避免在级联里重复选择同一组合
    const assignedPairs = React.useMemo(
        () => assignedMethods.map(m => `${m.item_id}-${m.method_id}`),
        [assignedMethods],
    );

    return (
        <Modal
            title={
                <Space>
                    <span className="text-lg font-black text-slate-800">分派检测项目及方法</span>
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
                        <span>分派检测项目及方法</span>
                    </div>

                    <Form form={methodForm} layout="vertical" disabled={disabled}>
                        <Form.Item name="method_id" rules={[{ required: true, message: '请至少选择一个检测项目及方法' }]} className="mb-0">
                            <MethodSelector disabledPairs={assignedPairs} />
                        </Form.Item>
                        {!disabled && (
                            <div className="mt-4 flex justify-end">
                                <Button type="primary" onClick={handleSaveMethod}>
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
                                                    {/* V3: item 与 method 强绑定，一并展示所属检测项目 */}
                                                    {m.item_name && (
                                                        <span className="text-[10px] text-blue-500 font-bold uppercase tracking-wider">{m.item_name}</span>
                                                    )}
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
