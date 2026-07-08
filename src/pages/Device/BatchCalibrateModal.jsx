import { Modal, Form, DatePicker } from "antd";
import dayjs from "dayjs";

const BatchCalibrateModal = ({
    open,
    count,
    user,
    form,
    submitting,
    onCancel,
    onSubmit,
}) => {
    return (
        <Modal
            title={`批量校准 (${count} 台设备)`}
            open={open}
            onCancel={onCancel}
            onOk={() => form.submit()}
            okText="确认批量校准"
            cancelText="取消"
            confirmLoading={submitting}
            width={420}
            destroyOnHidden
        >
            <Form
                form={form}
                layout="vertical"
                onFinish={onSubmit}
                initialValues={{ calibrated_at: dayjs() }}
                className="pt-4"
            >
                <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded text-blue-600 text-sm">
                    <strong>校准执行人:</strong>{" "}
                    {user?.nickname || user?.name || "未知用户"}
                    <div className="mt-1 text-xs text-blue-400">
                        将为所选 {count} 台设备统一写入同一校准日期。
                    </div>
                </div>
                <Form.Item
                    name="calibrated_at"
                    label="校准执行日期"
                    rules={[{ required: true, message: "请选择校准日期" }]}
                >
                    <DatePicker className="w-full" />
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default BatchCalibrateModal;
