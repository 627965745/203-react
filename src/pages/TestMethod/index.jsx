import React from "react";
import CrudTable from "../../components/CrudTable";
import { readTestMethod, createTestMethod, updateTestMethod, deleteTestMethod } from "../../api/testMethod";
import AddEdit from './AddEdit';
import { SafetyCertificateOutlined, CodeOutlined } from "@ant-design/icons";

const TestMethodList = () => {
    const columns = [
        {
            title: "序号",
            dataIndex: "id",
            width: "10%",
            align: "center",
        },
        {
            title: "检测方法名称",
            dataIndex: "name",
            width: "45%",
            render: (text) => (
                <div className="flex items-center gap-2">
                    <SafetyCertificateOutlined className="text-emerald-500" />
                    <span className="font-bold text-emerald-600">{text}</span>
                </div>
            )
        },
        {
            title: "国标代码",
            dataIndex: "code",
            width: "45%",
            render: (text) => (
                <div className="flex items-center gap-2">
                    <CodeOutlined className="text-gray-400" />
                    <code className="text-xs bg-gray-100 p-1 rounded px-2 font-mono">{text}</code>
                </div>
            )
        }
    ];

    const initialValues = {
        name: "",
        code: ""
    };

    return (
        <CrudTable
            title="检测方法管理"
            entityName="检测方法"
            columns={columns}
            api={{
                read: readTestMethod,
                create: createTestMethod,
                update: updateTestMethod,
                delete: deleteTestMethod
            }}
            AddEditForm={AddEdit}
            initialValues={initialValues}
            modalWidth={500}
        />
    );
};

export default TestMethodList;
