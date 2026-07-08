import React from "react";
import CrudTable from "../../components/CrudTable";
import { 
    readResourceAdminShare, 
    createResourceAdminShare, 
    updateResourceAdminShare, 
    deleteResourceAdminShare 
} from "../../api/share";
import AddEdit from "./AddEdit";
import { ShareAltOutlined, DownloadOutlined } from "@ant-design/icons";
import axios from "axios";
import { message } from "antd";

const ShareList = () => {
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

    const initialValues = {
        name: "",
        url: ""
    };

    return (
        <CrudTable
            title="文件共享管理"
            entityName="文件"
            columns={columns}
            api={{
                read: readResourceAdminShare,
                create: createResourceAdminShare,
                update: updateResourceAdminShare,
                delete: deleteResourceAdminShare
            }}
            AddEditForm={AddEdit}
            initialValues={initialValues}
            modalWidth={500}
        />
    );
};

export default ShareList;
