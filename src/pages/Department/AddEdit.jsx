import { useState, useEffect } from "react";
import { Input, Space, TreeSelect } from "antd";
import { readDepartment } from "../../api/department";

const AddEdit = ({ record, onChange }) => {
    const [errors, setErrors] = useState({});
    const [treeData, setTreeData] = useState([]);

    const validateInputs = () => {
        const newErrors = {};
        if (!record?.name || record.name.trim() === "") {
            newErrors.name = "部门名称不可为空";
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    useEffect(() => {
        if (typeof onChange === "function") {
            onChange.validate = validateInputs;
        }
    }, [record, onChange]);

    useEffect(() => {
        const fetchTreeData = async () => {
            try {
                const response = await readDepartment();
                if (response.data.status === 0 || response.data.code === 0) {
                    // Preprocess treeData for TreeSelect if needed
                    // Usually Ant TreeSelect expects { value, title, children }
                    // Our response uses { id, name, children }
                    const formatTree = (nodes) => (nodes || []).map(node => ({
                        value: node.id,
                        title: node.name,
                        children: formatTree(node.children),
                        // Avoid selecting itself as its own parent for editing
                        disabled: node.id === record?.id 
                    }));
                    setTreeData(formatTree(response.data.data));
                }
            } catch (error) {
                console.error("Error fetching departments for select:", error);
            }
        };
        fetchTreeData();
    }, [record?.id]);

    return (
        <Space orientation="vertical" className="w-full">
            <div>
                <div className="mb-2">上级部门</div>
                <TreeSelect
                    style={{ width: '100%' }}
                    value={record.parent_id || null}
                    styles={{ popup: { root: { maxHeight: 400, overflow: 'auto' } } }}
                    treeData={treeData}
                    placeholder="请选择上级部门（顶级部门留空）"
                    allowClear
                    treeDefaultExpandAll
                    onChange={(val) => onChange({ ...record, parent_id: val })}
                />
            </div>
            <div>
                <div className="mb-2">部门名称 <span className="text-red-500">*</span></div>
                <Input
                    placeholder="请输入部门名称"
                    value={record.name || ""}
                    onChange={(e) => {
                        onChange({ ...record, name: e.target.value });
                        if (errors.name) setErrors({...errors, name: null});
                    }}
                    status={errors.name ? "error" : ""}
                    maxLength={255}
                />
                {errors.name && (
                    <div className="text-red-500 text-sm mt-1">
                        {errors.name}
                    </div>
                )}
            </div>
        </Space>
    );
};

export default AddEdit;
