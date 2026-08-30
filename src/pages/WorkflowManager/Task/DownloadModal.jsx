import { useState, useEffect } from "react";
import { Modal, Form, Button, message, Space, Alert } from "antd";
import { templateTask } from "../../../api/workflow";
import MethodSelector from "../../../components/SampleManager/MethodSelector";

// V5: 模板下载请求大幅简化 —— 只保留 method_ids。客户ID / 接收人ID / 任务ID 不再参与
//     模板生成（模板「元数据」表中的 F1/F2/F3 已移除），改到「导入送样单」时以表单字段提交。
//     因此本弹窗不再需要客户、收样人下拉。
// V6: 模板再次改版 —— 元数据表不再输出「样品类型/分析类型」下拉选项，也不再预填截止日期；
//     基础信息只剩 B2 任务名称 / B3 联系人 / B4 联系方式 / B5 物态 / B6 备注。
//     样品类型、分析类型、检测类别、来样方式、截止日期改在「导入送样单」时以表单提交。
//     请求本身不变，仍只传 method_ids。
const DownloadModal = ({ visible, onCancel }) => {
    const [form] = Form.useForm();
    const [downloading, setDownloading] = useState(false);

    useEffect(() => {
        if (visible) {
            form.resetFields();
        }
    }, [visible]);

    const handleDownload = async () => {
        try {
            const values = await form.validateFields();
            setDownloading(true);

            // V5: 请求体只传 method_ids
            const res = await templateTask({ method_ids: values.method_ids });
            const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            // V5: 后端下载文件名已固定为「送样单」，前端命名同步对齐
            const fileName = `送样单_${new Date().getTime()}.xlsx`;

            if ('showSaveFilePicker' in window) {
                try {
                    const handle = await window.showSaveFilePicker({
                        suggestedName: fileName,
                        types: [{
                            description: 'Excel file',
                            accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] },
                        }],
                    });
                    const writable = await handle.createWritable();
                    await writable.write(blob);
                    await writable.close();
                    message.success("下载成功");
                    onCancel();
                    return;
                } catch (err) {
                    if (err.name === 'AbortError') return;
                    console.error("SaveFilePicker failed, falling back to standard download", err);
                }
            }

            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            
            message.success("模板下载成功");
            onCancel();
        } catch (error) {
            console.error(error);
        } finally {
            setDownloading(false);
        }
    };

    return (
        <Modal
            title="生成送样单"
            open={visible}
            onCancel={onCancel}
            okText="生成并下载"
            cancelText="取消"
            confirmLoading={downloading}
            width={600}
            footer={
                <div className="flex justify-between w-full">
                    <Button danger onClick={() => form.setFieldValue('method_ids', [])}>清空选择</Button>
                    <Space>
                        <Button onClick={onCancel}>取消</Button>
                        <Button type="primary" loading={downloading} onClick={handleDownload}>生成并下载</Button>
                    </Space>
                </div>
            }
        >
            {/* V6: 提示用户新模板不再填任务级信息，且旧模板不能再用于上传 */}
            <Alert
                type="info"
                showIcon
                className="mb-4 rounded-lg text-xs"
                message="新模板格式"
                description="基础信息只需填写 任务名称 / 联系人 / 联系方式 / 物态 / 备注；样品类型、分析类型、检测类别、来样方式、截止日期改在「导入送样单」时选择。旧版模板上传会解析失败，请重新下载。"
            />
            <Form form={form} layout="vertical" className="mt-4">
                {/* V5: 客户、收样人不再在此选择 —— 模板不预填客户名称，二者改在导入送样单时提交 */}
                {/* V3: item 与 method 强绑定，委托单请求体 item_ids 改为 method_ids: [{item_id, method_id}] */}
                <Form.Item
                    name="method_ids"
                    label="选择检测项目及方法"
                    rules={[{ required: true, message: '请至少选择一个检测项目及方法' }]}
                >
                    <MethodSelector />
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default DownloadModal;
