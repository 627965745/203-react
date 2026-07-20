// V2: 新增组件 —— 维护「检测方法 ↔ 加工选项」关联
// 后端变更说明 5.8：新增 /ResourceAdmin/TestMethod/processingOptionArrange 端点，
// 测试方法可关联多个加工选项（每个加工选项从属于某个加工方法）。
import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Cascader, message, Spin, Button, Space } from 'antd';
import { comboProcessingMethod } from '../../api/processingMethod';
import { processingOptionArrangeTestMethod } from '../../api/testMethod';

const ProcessingOptionArrangeModal = ({ visible, onClose, record, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [procMethods, setProcMethods] = useState([]);
    // 已选加工选项，存为 [加工方法id, 加工选项id] 的路径数组，供 Cascader 使用
    const [selectedPaths, setSelectedPaths] = useState([]);

    // 加工方法 -> 加工选项 的级联结构
    const cascaderOptions = useMemo(() => (
        procMethods.map(m => ({
            label: m.name,
            value: String(m.id),
            children: (m.options || []).map(o => ({
                label: o.value,
                value: String(o.id),
            })),
        }))
    ), [procMethods]);

    useEffect(() => {
        if (visible) {
            fetchProcMethods();
            // record.processing_options[] 结构见后端说明 5.8：
            // { id(=加工选项id), processing_method_id, processing_method_name, processing_option_value }
            if (record?.processing_options?.length > 0) {
                setSelectedPaths(
                    record.processing_options.map(p => [
                        String(p.processing_method_id),
                        String(p.id),
                    ]),
                );
            } else {
                setSelectedPaths([]);
            }
        }
    }, [visible, record]);

    const fetchProcMethods = async () => {
        setLoading(true);
        try {
            const res = await comboProcessingMethod();
            if (res.data.status === 0) {
                setProcMethods(res.data.data || []);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleOk = async () => {
        setSubmitting(true);
        try {
            // 取每条路径的叶子节点（加工选项 id）
            const optionIds = selectedPaths.map(path => {
                const leaf = Array.isArray(path) ? path[path.length - 1] : path;
                return Number(leaf);
            });
            const res = await processingOptionArrangeTestMethod({
                ids: [record.id],
                // 注意：沿用现有代码中加工选项统一使用的 option_ids 命名，如后端字段不同请同步调整
                processing_option_ids: optionIds,
            });
            if (res.data.status === 0) {
                message.success('关联加工选项成功');
                if (onSuccess) onSuccess();
                onClose();
            } else {
                message.error(res.data.message || '关联失败');
            }
        } catch (e) {
            message.error('接口异常');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal
            title={record ? `关联加工方法 - ${record.name}` : '关联加工方法'}
            open={visible}
            onCancel={onClose}
            okText="确定"
            cancelText="取消"
            destroyOnHidden
            footer={
                <div className="flex justify-between w-full">
                    <Button danger onClick={() => setSelectedPaths([])}>清空选择</Button>
                    <Space>
                        <Button onClick={onClose}>取消</Button>
                        <Button type="primary" loading={submitting} onClick={handleOk}>保存</Button>
                    </Space>
                </div>
            }
        >
            <div className="pt-4 pb-2">
                <div className="mb-2 text-gray-500">请选择该检测方法可采用的加工工序及具体选项（支持多选）：</div>
                {loading && procMethods.length === 0 ? (
                    <div className="text-center py-4"><Spin size="small" /></div>
                ) : (
                    <Cascader
                        multiple
                        placeholder={cascaderOptions.length > 0 ? '选择加工工序及其具体参数' : '暂无可选加工方法'}
                        options={cascaderOptions}
                        value={selectedPaths}
                        onChange={setSelectedPaths}
                        showSearch
                        style={{ width: '100%' }}
                        expandTrigger="hover"
                        maxTagCount="responsive"
                        displayRender={(labels) => labels.join(' / ')}
                        showCheckedStrategy="SHOW_CHILD"
                        // V2: 加宽下拉面板每列宽度，使其与「关联项目」ArrangeModal 的下拉框长度一致
                        popupMenuColumnStyle={{ minWidth: 236 }}
                    />
                )}
            </div>
        </Modal>
    );
};

export default ProcessingOptionArrangeModal;
