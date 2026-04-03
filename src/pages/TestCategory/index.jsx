import React from "react";
import CrudTable from "../../components/CrudTable";
import { readTestCategory, createTestCategory, updateTestCategory, deleteTestCategory } from "../../api/testCategory";
import AddEdit from './AddEdit';
import { AppstoreOutlined } from "@ant-design/icons";

const TestCategoryList = () => {
    const columns = [
        {
            title: "序号",
            dataIndex: "id",
            width: "20%",
            align: "center",
        },
        {
            title: "检测类别名称",
            dataIndex: "name",
            width: "60%",
            render: (text) => (
                <div className="flex items-center gap-2">
                    <AppstoreOutlined className="text-teal-500" />
                    <span className="font-bold text-teal-600">{text}</span>
                </div>
            )
        }
    ];

    const initialValues = {
        name: ""
    };

    return (
        <CrudTable
            title="检测类别管理"
            entityName="检测类别"
            columns={columns}
            api={{
                read: readTestCategory,
                create: createTestCategory,
                update: updateTestCategory,
                delete: deleteTestCategory
            }}
            AddEditForm={AddEdit}
            initialValues={initialValues}
            modalWidth={500}
        />
    );
};

export default TestCategoryList;
