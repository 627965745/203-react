import React, { useState, useEffect } from "react";
import { Modal, Form, InputNumber, message, Alert } from "antd";
import { useReferenceSample } from "../../api/referenceSample";

// V5: 标准样品领用 —— 请求 { id, used }，后端扣减余量
const UseModal = ({ visible, onCancel, record, onSuccess }) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (visible && record) {
            form.resetFields();
            form.setFieldsValue({ id: record.id, used: 0 });
        }
    }, [visible, record]);

    const handleFinish = async (values) => {
        if (values.used <= 0) {
            message.warning("使用数量必须大于0");
            return;
        }
        // V5: 数值字段以字符串形式返回（DECIMAL 转 CHAR），比较前需 Number() 转换
        if (values.used > Number(record.remaining)) {
            message.warning("使用数量不能超过余量");
            return;
        }

        try {
            setLoading(true);
            const res = await useReferenceSample(values);
            if (res.data.status === 0) {
                message.success("领用记录成功");
                onSuccess();
                onCancel();
            } else {
                message.error(res.data.message || "记录失败");
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            title={`领用标准样品 - ${record?.name || ""}`}
            open={visible}
            okText="确定"
            cancelText="取消"
            onCancel={onCancel}
            onOk={() => form.submit()}
            confirmLoading={loading}
            width={500}
            destroyOnHidden
        >
            <Alert
                message={`当前余量: ${record?.remaining ?? "-"} ${record?.unit || ""}`}
                type="info"
                showIcon
                className="mb-4"
            />
            <Form form={form} layout="vertical" onFinish={handleFinish}>
                <Form.Item name="id" hidden>
                    <InputNumber />
                </Form.Item>
                <Form.Item
                    name="used"
                    label="领用数量"
                    rules={[{ required: true, message: "请输入领用数量" }]}
                >
                    <InputNumber
                        className="w-full"
                        min={0.0001}
                        precision={4}
                        placeholder="请输入本次领用的数量"
                        addonAfter={record?.unit || "g/mL"}
                        autoFocus
                    />
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default UseModal;
