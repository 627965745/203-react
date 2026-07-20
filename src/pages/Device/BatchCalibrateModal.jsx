import { useState, useEffect } from "react";
import { Modal, DatePicker, Input, Upload, Button, message } from "antd";
import { UploadOutlined, LoadingOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { uploadFile } from "../../api/user";

const BatchCalibrateModal = ({
    open,
    rows = [],
    submitting,
    onCancel,
    onSubmit,
}) => {
    // Per-device entries: { [id]: { calibrator, calibrated_at(dayjs), certificate_file, uploading } }
    const [entries, setEntries] = useState({});

    useEffect(() => {
        if (open) {
            const init = {};
            rows.forEach((r) => {
                init[r.id] = {
                    calibrator: "",
                    calibrated_at: dayjs(),
                    certificate_file: "",
                    uploading: false,
                };
            });
            setEntries(init);
        }
    }, [open, rows]);

    const update = (id, field, value) =>
        setEntries((prev) => ({
            ...prev,
            [id]: { ...prev[id], [field]: value },
        }));

    const handleUpload = async (id, { file }) => {
        update(id, "uploading", true);
        const formData = new FormData();
        formData.append("file", file);
        try {
            const res = await uploadFile(formData);
            if (res.data.status === 0) {
                update(id, "certificate_file", `/uploads/${res.data.data}`);
                message.success("校准证书上传成功");
            } else {
                message.error(res.data.message || "上传文件失败");
            }
        } catch (error) {
            console.error("File upload error:", error);
            message.error(error.response?.data?.message || "上传文件出错");
        } finally {
            update(id, "uploading", false);
        }
    };

    const handleOk = () => {
        const missing = rows.filter((r) => {
            const e = entries[r.id] || {};
            return !e.calibrator?.trim() || !e.calibrated_at;
        });
        if (missing.length > 0) {
            message.warning("请为每台设备填写校准单位和校准日期");
            return;
        }
        const payload = rows.map((r) => {
            const e = entries[r.id];
            return {
                device_id: r.id,
                calibrator: e.calibrator.trim(),
                calibrated_at: e.calibrated_at.format("YYYY-MM-DD"),
                certificate_file: e.certificate_file?.trim() || null,
            };
        });
        onSubmit(payload);
    };

    // Any close attempt (mask click / X / ESC / cancel) confirms first so the
    // user doesn't accidentally lose everything they've typed.
    const handleClose = () => {
        const hasData = rows.some((r) => {
            const e = entries[r.id] || {};
            return e.calibrator?.trim() || e.certificate_file?.trim();
        });
        if (!hasData) {
            onCancel();
            return;
        }
        Modal.confirm({
            title: "确认关闭批量校准？",
            content: "关闭后已填写的校准信息将全部丢失。",
            okText: "确认关闭",
            cancelText: "继续填写",
            okButtonProps: { danger: true },
            onOk: onCancel,
        });
    };

    return (
        <Modal
            title={`批量校准 (${rows.length} 台设备)`}
            open={open}
            onCancel={handleClose}
            onOk={handleOk}
            okText="确认批量校准"
            cancelText="取消"
            confirmLoading={submitting}
            width={680}
            destroyOnHidden
        >
            <div className="text-xs text-slate-400 mb-3 mt-1">
                请为每台设备分别填写校准单位与校准日期（校准证书选填）。
            </div>
            <div className="max-h-[60vh] overflow-y-auto pr-1 space-y-3">
                {rows.map((r) => {
                    const e = entries[r.id] || {};
                    return (
                        <div
                            key={r.id}
                            className="border border-slate-100 rounded-xl p-3 bg-slate-50/50"
                        >
                            <div className="font-bold text-slate-700 mb-2">
                                {r.name}
                                <span className="ml-2 text-xs text-slate-400 font-normal">
                                    {r.asset_code || r.serial || `#${r.id}`}
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <div className="text-xs text-slate-500 mb-1">
                                        校准单位{" "}
                                        <span className="text-red-500">*</span>
                                    </div>
                                    <Input
                                        value={e.calibrator}
                                        onChange={(ev) =>
                                            update(
                                                r.id,
                                                "calibrator",
                                                ev.target.value,
                                            )
                                        }
                                        placeholder="请输入校准单位"
                                        maxLength={255}
                                    />
                                </div>
                                <div>
                                    <div className="text-xs text-slate-500 mb-1">
                                        校准日期{" "}
                                        <span className="text-red-500">*</span>
                                    </div>
                                    <DatePicker
                                        className="w-full"
                                        value={e.calibrated_at}
                                        onChange={(d) =>
                                            update(r.id, "calibrated_at", d)
                                        }
                                    />
                                </div>
                            </div>
                            <div className="mt-2">
                                <div className="text-xs text-slate-500 mb-1">
                                    校准证书（选填）
                                </div>
                                <div className="flex gap-2">
                                    <Input
                                        value={e.certificate_file}
                                        onChange={(ev) =>
                                            update(
                                                r.id,
                                                "certificate_file",
                                                ev.target.value,
                                            )
                                        }
                                        placeholder="上传后自动填充，也可直接粘贴链接"
                                        maxLength={1000}
                                    />
                                    <Upload
                                        customRequest={(o) =>
                                            handleUpload(r.id, o)
                                        }
                                        showUploadList={false}
                                        beforeUpload={() => true}
                                    >
                                        <Button
                                            icon={
                                                e.uploading ? (
                                                    <LoadingOutlined />
                                                ) : (
                                                    <UploadOutlined />
                                                )
                                            }
                                            loading={e.uploading}
                                            className="rounded-lg font-semibold"
                                        >
                                            {e.certificate_file
                                                ? "重新上传"
                                                : "上传"}
                                        </Button>
                                    </Upload>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </Modal>
    );
};

export default BatchCalibrateModal;
