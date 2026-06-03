import { useState, useEffect } from "react";
import { Modal, Cascader, Form, Button, message, Space, Select } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import { comboClient } from "../../../api/client";
import { comboTestItem } from "../../../api/testItem";
import { templateTask } from "../../../api/workflow";

const DownloadModal = ({ visible, onCancel }) => {
    const [form] = Form.useForm();
    const [clients, setClients] = useState([]);
    const [items, setItems] = useState([]);
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
            const [resClients, resItems] = await Promise.all([
                comboClient(),
                comboTestItem()
            ]);
            setClients(resClients.data.data || []);
            setItems(resItems.data.data || []);
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async () => {
        try {
            const rawValues = await form.validateFields();
            setDownloading(true);
            
            // Flatten Cascader values [[catId, itemId], ...] to [itemId, ...]
            const itemIds = (rawValues.item_ids || []).map(path => path[path.length - 1]);
            const values = { ...rawValues, item_ids: itemIds };
            
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

    const options = items.map(cat => ({
        label: cat.name,
        value: `cat-${cat.id}`,
        children: (cat.items || []).map(i => ({
            label: i.name,
            value: i.id
        }))
    }));

    return (
        <Modal
            title="生成任务模板"
            open={visible}
            onCancel={onCancel}
            okText="生成并下载"
            cancelText="取消"
            confirmLoading={downloading}
            width={600}
            footer={
                <div className="flex justify-between w-full">
                    <Button danger onClick={() => form.setFieldValue('item_ids', [])}>清空项目</Button>
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
                    name="item_ids"
                    label="选择检测项目 (按分类选择)"
                    rules={[{ required: true, message: '请至少选择一个检测项目' }]}
                >
                    <Cascader
                        options={options}
                        multiple
                        placeholder="点击选择分类及项目"
                        showSearch={{
                            filter: (inputValue, path) => 
                                path.some(option => option.label.toLowerCase().indexOf(inputValue.toLowerCase()) > -1)
                        }}
                        expandTrigger="hover"
                        maxTagCount="responsive"
                        style={{ height: 'auto', minHeight: '34px' }}
                        dropdownStyle={{ width: '600px' }}
                        dropdownClassName="large-cascader"
                    />
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default DownloadModal;
