import { Modal, Table } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import axios from "axios";

const downloadCertificate = async (url) => {
    try {
        const downloadUrl = `${window.location.origin}${url}`;
        const response = await axios.get(downloadUrl, { responseType: "blob" });
        const blob = new Blob([response.data]);
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = url.split("/").pop() || "certificate";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
        console.error("Download error:", error);
        window.open(`${window.location.origin}${url}`, "_blank");
    }
};

const CalibrateHistoryModal = ({ open, record, onCancel }) => {
    const logs = record?.calibration_logs || [];

    const columns = [
        { title: "校准日期", dataIndex: "calibrated_at", width: 120 },
        {
            title: "校准单位",
            dataIndex: "calibrator",
            ellipsis: true,
            render: (t) => t || "-",
        },
        {
            title: "记录时间",
            dataIndex: "created_at",
            width: 170,
            render: (t) => (
                <span className="text-xs text-slate-400 font-mono">
                    {t || "-"}
                </span>
            ),
        },
        {
            title: "校准证书",
            dataIndex: "certificate_file",
            width: 100,
            render: (url) =>
                url ? (
                    <span
                        onClick={() => downloadCertificate(url)}
                        className="text-blue-600 font-bold hover:underline cursor-pointer inline-flex items-center gap-1"
                    >
                        <DownloadOutlined /> 下载
                    </span>
                ) : (
                    <span className="text-gray-300 italic text-[11px]">无</span>
                ),
        },
    ];

    return (
        <Modal
            title={`校准历史 - ${record?.name || ""}`}
            open={open}
            onCancel={onCancel}
            footer={null}
            width={740}
            destroyOnHidden
        >
            <Table
                dataSource={logs}
                columns={columns}
                rowKey={(r, i) => `${r.calibrated_at}_${i}`}
                size="small"
                pagination={false}
                scroll={{ y: 400 }}
            />
        </Modal>
    );
};

export default CalibrateHistoryModal;
