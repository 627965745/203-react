import { useState, useEffect } from "react";
import { Modal, Form, DatePicker, Input, Upload, Button, message } from "antd";
import { UploadOutlined, LoadingOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { uploadFile } from "../../api/user";

const CalibrateModal = ({ open, record, form, onCancel, onSubmit }) => {
    const [uploading, setUploading] = useState(false);
    const certificateFile = Form.useWatch("certificate_file", form);

    useEffect(() => {
        if (open) {
            form.resetFields();
        }
    }, [open, form]);

    const handleUpload = async ({ file }) => {
        const formData = new FormData();
        formData.append("file", file);
        setUploading(true);
        try {
            const response = await uploadFile(formData);
            if (response.data.status === 0) {
                form.setFieldValue(
                    "certificate_file",
                    `/uploads/${response.data.data}`,
                );
                message.success("校准证书上传成功");
            } else {
                message.error(response.data.message || "上传文件失败");
            }
        } catch (error) {
            console.error("File upload error:", error);
            message.error(error.response?.data?.message || "上传文件出错");
        } finally {
            setUploading(false);
        }
    };

    return (
        <Modal
            title={`设备校准 - ${record?.name}`}
            open={open}
            onCancel={onCancel}
            onOk={() => form.submit()}
            okText="确认校准"
            cancelText="取消"
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
                <Form.Item
                    name="calibrator"
                    label="校准单位"
                    rules={[{ required: true, message: "请输入校准单位" }]}
                >
                    <Input placeholder="请输入校准单位" maxLength={255} />
                </Form.Item>
                <Form.Item
                    name="calibrated_at"
                    label="校准日期"
                    rules={[{ required: true, message: "请选择校准日期" }]}
                >
                    <DatePicker className="w-full" />
                </Form.Item>
                <Form.Item label="校准证书（选填）" className="mb-0">
                    <div className="flex gap-2">
                        <Form.Item name="certificate_file" noStyle>
                            <Input
                                placeholder="上传后自动填充，也可直接粘贴链接"
                                maxLength={1000}
                            />
                        </Form.Item>
                        <Upload
                            customRequest={handleUpload}
                            showUploadList={false}
                            beforeUpload={() => true}
                        >
                            <Button
                                icon={
                                    uploading ? (
                                        <LoadingOutlined />
                                    ) : (
                                        <UploadOutlined />
                                    )
                                }
                                loading={uploading}
                                className="rounded-lg font-semibold"
                            >
                                {certificateFile ? "重新上传" : "上传"}
                            </Button>
                        </Upload>
                    </div>
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default CalibrateModal;
