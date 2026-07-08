import React from "react";
import CrudTable from "../../components/CrudTable";
import { readFile } from "../../api/user";
import { ShareAltOutlined, DownloadOutlined } from "@ant-design/icons";
import axios from "axios";
import { message } from "antd";

const FileSharePage = () => {
    const handleDownload = async (url, filename) => {
        try {
            const downloadUrl = `${window.location.origin}${url}`;

            const response = await axios.get(downloadUrl, { responseType: "blob" });
            const blob = new Blob([response.data]);
            
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = blobUrl;
            // Extract extension if exists
            const ext = url.includes(".") ? `.${url.split(".").pop()}` : "";
            link.download = filename ? (filename.endsWith(ext) ? filename : `${filename}${ext}`) : (url.split("/").pop() || "download");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        } catch (error) {
            console.error("Download error:", error);
            window.open(`${window.location.origin}${url}`, "_blank");
        }
    };

    const columns = [
        {
            title: "序号",
            dataIndex: "id",
            width: 70,
            align: "center",
        },
        {
            title: "文件名称",
            dataIndex: "name",
            ellipsis: true,
            render: (text) => (
                <div className="flex items-center gap-2 min-w-0">
                    <ShareAltOutlined className="text-blue-500 shrink-0" />
                    <span className="font-bold text-slate-700 truncate">{text}</span>
                </div>
            )
        },
        {
            title: "文件链接",
            dataIndex: "url",
            ellipsis: true,
            render: (text, record) => (
                <span
                    onClick={() => handleDownload(text, record.name)}
                    className="text-blue-600 font-bold hover:underline cursor-pointer inline-flex items-center gap-1"
                >
                    <DownloadOutlined /> 点击下载
                </span>
            )
        }
    ];

    return (
        <CrudTable
            title="共享文件列表"
            entityName="文件"
            columns={columns}
            api={{
                read: readFile
            }}
            hideAdd={true}
            hideAction={true}
        />
    );
};

export default FileSharePage;
