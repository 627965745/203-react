import React from "react";
import CrudTable from "../../components/CrudTable";
import { readReportCover, createReportCover, updateReportCover, deleteReportCover } from "../../api/reportCover";
import AddEdit from './AddEdit';
import { FileWordOutlined } from "@ant-design/icons";

const ReportCoverList = () => {
    const columns = [
        {
            title: "序号",
            dataIndex: "id",
            width: "10%",
            align: "center",
        },
        {
            title: "模板名称",
            dataIndex: "name",
            width: "30%",
            render: (text) => <span className="font-bold text-blue-600">{text}</span>
        },
        {
            title: "模板文件路径",
            dataIndex: "template_file",
            width: "30%",
            render: (text) => (
                <div className="flex items-center gap-2">
                    <FileWordOutlined className="text-blue-500" />
                    <code className="text-xs bg-gray-100 p-1 rounded font-mono">{text}</code>
                </div>
            )
        },
        {
            title: "描述",
            dataIndex: "description",
            width: "30%",
            ellipsis: true,
            render: (text) => text || <span className="text-gray-300 italic">暂无描述</span>
        }
    ];

    const initialValues = {
        name: "",
        template_file: "",
        description: ""
    };

    return (
        <CrudTable
            title="报告封面模板管理"
            entityName="模板"
            columns={columns}
            api={{
                read: readReportCover,
                create: createReportCover,
                update: updateReportCover,
                delete: deleteReportCover
            }}
            AddEditForm={AddEdit}
            initialValues={initialValues}
            modalWidth={600}
        />
    );
};

export default ReportCoverList;
