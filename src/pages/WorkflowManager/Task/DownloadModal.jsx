import { useState, useEffect } from "react";
import { Modal, Form, Button, message, Space, Select } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import { comboClient } from "../../../api/client";
import { comboUser } from "../../../api/user";
import { templateTask } from "../../../api/workflow";
import MethodSelector from "../../../components/SampleManager/MethodSelector";

const DownloadModal = ({ visible, onCancel }) => {
    const [form] = Form.useForm();
    const [clients, setClients] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [downloading, setDownloading] = useState(false);

    useEffect(() => {
        if (visible) {
            fetchOptions();
            form.resetFields();
        }
    }, [visible]);

    const fetchOptions = async () => {
        setLoading(true);
        try {
            // V3: 检测项目/方法级联由 MethodSelector 自行加载，这里只需客户与收样人下拉
            const [resClients, resUsers] = await Promise.all([
                comboClient(),
                comboUser()
            ]);
            setClients(resClients.data.data || []);
            setUsers(resUsers.data.data || []);
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async () => {
        try {
            const values = await form.validateFields();
            setDownloading(true);

            const res = await templateTask(values);
            const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const fileName = `任务导入模板_${new Date().getTime()}.xlsx`;

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
            <Form form={form} layout="vertical" className="mt-4">
                <Form.Item
                    name="client_id"
                    label="选择客户"
                    rules={[{ required: true, message: '请选择客户' }]}
                >
                    <Select
                        showSearch
                        placeholder="请选择客户"
                        loading={loading}
                        options={clients.map(c => ({ label: c.name, value: c.id }))}
                        filterOption={(input, option) =>
                            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                        }
                    />
                </Form.Item>
                <Form.Item
                    name="receiver_id"
                    label="选择收样人"
                    rules={[{ required: true, message: '请选择收样人' }]}
                >
                    <Select
                        showSearch
                        placeholder="请选择收样人"
                        loading={loading}
                        options={users.map(u => ({ label: u.nickname || u.name, value: u.id }))}
                        filterOption={(input, option) =>
                            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                        }
                    />
                </Form.Item>
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
