import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Table, Input, Button, message, Modal, Space, Popconfirm, Tooltip } from "antd";
import {
    PlusOutlined,
    EditOutlined,
    DeleteOutlined,
    SearchOutlined
} from "@ant-design/icons";

/**
 * Generic CRUD Table Component
 * @param {Object} props
 * @param {string} props.title - The title displayed in the header
 * @param {string} props.entityName - Name of the entity for messages (e.g. "部门")
 * @param {Array} props.columns - Ant Design table columns
 * @param {Object} props.api - API service matching { read, create, update, delete }
 * @param {React.Component} props.AddEditForm - Form component for adding/editing 
 * @param {Object} props.initialValues - Default values for new records
 * @param {Object} props.tableProps - Additional props to pass to Ant Design Table
 * @param {boolean} props.hideAdd - Whether to hide the Add button
 * @param {boolean} props.hideSearch - Whether to hide the search bar
 * @param {string} props.searchPlaceholder - Placeholder for search input
 * @param {React.ReactNode} props.headerExtra - Extra content in header next to title
 * @param {React.ReactNode} props.actionExtra - Extra content in action bar
 * @param {function} props.formatData - Optional function to format record before editing
 * @param {function} props.formatPayload - Optional function to format payload before saving
 * @param {number} props.modalWidth - Width of the modal (default: 650)
 * @param {function} props.renderExpandedRow - Optional function for Ant Design expandable.expandedRowRender
 */
const CrudTable = ({
    title,
    entityName,
    columns,
    api,
    AddEditForm,
    initialValues = {},
    tableProps = {},
    hideAdd = false,
    hideSearch = false,
    searchPlaceholder = "请输入关键词搜索...",
    headerExtra,
    actionExtra,
    formatData,
    formatPayload,
    modalWidth = 650,
    renderExpandedRow
}) => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 10,
        total: 0,
    });
    const [filterValue, setFilterValue] = useState("");
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [currentRecord, setCurrentRecord] = useState(initialValues);
    const [editingRecord, setEditingRecord] = useState(null);
    const isManualFetch = useRef(false);

    const fetchData = useCallback(async (page, rows, query) => {
        if (!api.read) return;
        setLoading(true);
        try {
            const response = await api.read({
                page: page - 1,
                rows,
                query,
            });

            if (response.data.status === 0 || response.data.code === 0) {
                const responseData = response.data.data;
                
                let rows = [];
                let total = 0;
                
                if (Array.isArray(responseData)) {
                    rows = responseData;
                    total = responseData.length;
                } else {
                    rows = responseData?.rows || [];
                    total = responseData?.total || responseData?.count || 0;
                }

                setData(rows);
                setPagination(prev => ({
                    ...prev,
                    current: page,
                    total: total,
                }));
            } else {
                message.error(response.data?.message || `获取${entityName}列表失败`);
            }
        } catch (error) {
            console.error(`Error fetching ${entityName}:`, error);
            message.error(error.response?.data?.message || `获取${entityName}数据异常`);
        } finally {
            setLoading(false);
        }
    }, [api, entityName]);

    useEffect(() => {
        fetchData(pagination.current, pagination.pageSize, "");
    }, [fetchData, pagination.pageSize]);

    const handleAdd = () => {
        setCurrentRecord(initialValues);
        setIsModalVisible(true);
    };

    const handleCancel = () => {
        setIsModalVisible(false);
    };

    const handleCreate = async () => {
        if (typeof setCurrentRecord.validate === "function" && !setCurrentRecord.validate()) {
            return;
        }
        
        try {
            let payload = { ...currentRecord };
            if (formatPayload) {
                payload = formatPayload(payload, 'create');
            }
            
            const response = await api.create(payload);

            if (response.data.status === 0 || response.data.code === 0) {
                message.success(`创建${entityName}成功`);
                setIsModalVisible(false);
                fetchData(1, pagination.pageSize, filterValue);
            } else {
                message.error(response.data?.message || `创建${entityName}失败`);
            }
        } catch (error) {
            console.error(`Error creating ${entityName}:`, error);
            message.error(error.response?.data?.message || `创建${entityName}异常`);
        }
    };

    const handleEdit = (record) => {
        let formattedRecord = { ...record };
        if (formatData) {
            formattedRecord = formatData(record);
        }
        setEditingRecord(formattedRecord);
        setEditModalVisible(true);
    };

    const handleEditCancel = () => {
        setEditModalVisible(false);
        setEditingRecord(null);
    };

    const handleUpdate = async () => {
        if (typeof setEditingRecord.validate === "function" && !setEditingRecord.validate()) {
            return;
        }
        
        try {
            let payload = { ...editingRecord };
            if (formatPayload) {
                payload = formatPayload(payload, 'update');
            }

            const response = await api.update(payload);

            if (response.data.status === 0 || response.data.code === 0) {
                message.success(`修改${entityName}成功`);
                setEditingRecord(null);
                setEditModalVisible(false);
                fetchData(pagination.current, pagination.pageSize, filterValue);
            } else {
                message.error(response.data?.message || `修改${entityName}失败`);
            }
        } catch (error) {
            console.error(`Error updating ${entityName}:`, error);
            if (error?.message && error?.message?.includes('改动')) {
                 setEditModalVisible(false);
            }
        }
    };

    const handleDelete = async (id) => {
        try {
            const response = await api.delete({ id });
            if (response.data.status === 0 || response.data.code === 0) {
                message.success("删除成功");
                let newCurrent = pagination.current;
                if (data.length === 1 && pagination.current > 1) {
                    newCurrent = pagination.current - 1;
                }
                fetchData(newCurrent, pagination.pageSize, filterValue);
            } else {
               message.error(response.data?.message || "删除失败");
            }
        } catch (error) {
            message.error(error.response?.data?.message || "删除异常");
        }
    };

    const handleTableChange = (page, newPageSize) => {
        setPagination(prev => ({
            ...prev,
            current: page,
            pageSize: newPageSize,
        }));
        fetchData(page, newPageSize, filterValue);
    };

    const actionColumn = {
        title: "操作",
        key: "action",
        width: "120px",
        align: "center",
        render: (_, record) => (
            <Space size="small">
                <Tooltip title="编辑">
                    <Button type="text" onClick={() => handleEdit(record)} icon={<EditOutlined className="text-blue-500" />} />
                </Tooltip>
                
                <Popconfirm
                   title={`确认要删除该${entityName}吗？`}
                   okText="确定"
                   cancelText="取消"
                   placement="left"
                   onConfirm={() => handleDelete(record.id)}
                >
                   <Tooltip title="删除">
                       <Button type="text" danger icon={<DeleteOutlined />} />
                   </Tooltip>
                </Popconfirm>
            </Space>
        ),
    };

    const mergedColumns = useMemo(() => {
        // Ensure no duplicate action column and put it last
        const filtered = columns.filter(col => col.key !== 'action');
        return [...filtered, actionColumn];
    }, [columns]);

    return (
        <div className="flex flex-col bg-white min-h-[calc(100vh-112px)] pl-6">
            <div className="mb-6 flex justify-between items-center">
                <h1 className="text-xl font-bold text-gray-800 m-0">{title}</h1>
                {headerExtra}
            </div>
            
            <div className="flex justify-between items-center mb-4">
                <Space>
                    {!hideAdd && (
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={handleAdd}
                        >
                            新增{entityName}
                        </Button>
                    )}
                    {actionExtra}
                </Space>
                
                {!hideSearch && (
                    <Input.Search
                        placeholder={searchPlaceholder}
                        allowClear
                        onSearch={(value) => {
                            setFilterValue(value);
                            isManualFetch.current = true;
                            fetchData(1, pagination.pageSize, value);
                        }}
                        style={{ width: 300 }}
                        enterButton="搜索"
                    />
                )}
            </div>
            
            <Table
                columns={mergedColumns}
                dataSource={data}
                pagination={{
                    total: pagination.total,
                    current: pagination.current,
                    pageSize: pagination.pageSize,
                    showSizeChanger: true,
                    pageSizeOptions: ['10', '20', '50', '100'],
                    showTotal: (total, range) => `显示 ${range[0]}-${range[1]} / 共 ${total} 项`,
                }}
                onChange={(paginationConfig) => {
                    if (isManualFetch.current) {
                        isManualFetch.current = false;
                        return;
                    }
                    if (paginationConfig.current !== pagination.current || 
                        paginationConfig.pageSize !== pagination.pageSize) {
                        handleTableChange(paginationConfig.current, paginationConfig.pageSize);
                    }
                }}
                loading={loading}
                rowKey="id"
                bordered
                size="middle"
                className="mt-4"
                expandable={renderExpandedRow ? { expandedRowRender: renderExpandedRow } : tableProps.expandable}
                {...tableProps}
            />
            
            <Modal
                title={`新增${entityName}`}
                open={isModalVisible}
                onOk={handleCreate}
                onCancel={handleCancel}
                okText="确定"
                cancelText="取消"
                width={modalWidth}
                destroyOnHidden
            >
                <div className="pt-4">
                    {AddEditForm && (
                        <AddEditForm
                            {...{[entityName.toLowerCase() || 'record']: currentRecord}} // Dynamic prop name
                            record={currentRecord} // Fallback consistent name
                            onChange={setCurrentRecord}
                        />
                    )}
                </div>
            </Modal>
            
            <Modal
                title={`编辑${entityName}`}
                open={editModalVisible}
                onOk={handleUpdate}
                onCancel={handleEditCancel}
                okText="确定修改"
                cancelText="取消"
                width={modalWidth}
                destroyOnHidden
            >
                <div className="pt-4">
                    {editingRecord && AddEditForm && (
                        <AddEditForm
                            {...{[entityName.toLowerCase() || 'record']: editingRecord}}
                            record={editingRecord}
                            onChange={setEditingRecord}
                        />
                    )}
                </div>
            </Modal>
        </div>
    );
};

export default CrudTable;
