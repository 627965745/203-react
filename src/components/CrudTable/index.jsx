import React, {
    useState,
    useEffect,
    useRef,
    useCallback,
    useMemo,
} from "react";
import {
    Table,
    Input,
    Button,
    message,
    Modal,
    Space,
    Popconfirm,
    Tooltip,
    Tag,
    Dropdown,
} from "antd";
import {
    PlusOutlined,
    EditOutlined,
    DeleteOutlined,
    SearchOutlined,
    DownOutlined,
    UpOutlined,
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
 * @param {boolean} props.hideAction - Whether to hide the entire action column
 * @param {boolean} props.hideEdit - Whether to hide the Edit button
 * @param {boolean} props.hideDelete - Whether to hide the Delete button
 * @param {function} props.formatData - Optional function to format record before editing
 * @param {function} props.formatPayload - Optional function to format payload before saving
 * @param {number} props.modalWidth - Width of the modal (default: 650)
 * @param {function} props.renderExpandedRow - Optional function for Ant Design expandable.expandedRowRender
 * @param {number} props.defaultPageSize - Initial page size (default: 20). Do not pass `pagination`
 *   via tableProps to change this — tableProps is spread after CrudTable's own controlled
 *   `pagination` prop on the underlying Table, so a `tableProps.pagination` would silently
 *   clobber it and disconnect paging from CrudTable's fetch logic.
 * @param {boolean} props.fillHeight - Make the table body the ONLY scroll area inside a
 *   height-bounded parent: content taller than the space scrolls internally with the pagination
 *   pinned below it, while short content keeps its natural height with the pagination sitting
 *   right under the last row. The parent must be height-bounded (e.g. `h-full`) and must NOT
 *   scroll itself (`overflow-hidden`), otherwise you get two scrollbars.
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
    hideAction = false,
    hideEdit = false,
    hideDelete = false,
    formatData,
    formatPayload,
    modalWidth = 650,
    defaultPageSize = 20,
    fillHeight = false,
    renderExpandedRow,
    renderActions, // New prop for custom action column content
    actionWidth = 160, // Width of the action column; widen when renderActions adds extra buttons
    filterValues, // Current filter state
    filterConfig, // Metadata for filters { category: { label: '分类', options: [...] } }
    onClearFilter, // Callback for clearing a specific filter
    onClearAll, // Callback for clearing all filters
    scroll = { x: 1000 }, // Table scroll prop
    expandAll = false, // Whether to expand all rows by default
    refreshKey, // Optional prop to trigger a refresh from parent
    onDataLoaded, // Callback when data is successfully loaded
    isRecordEditable, // Callback to check if a record is editable (default is true)
    className = "",
    batchActions, // Optional array of batch operations => enables multi-select + inline actions
    // [{ key, label, icon, danger?, disabled?(rows), onClick(rows, { clearSelection, refresh }) }]
    batchDropdown = false, // Collapse batchActions into a single "批量操作" dropdown
    batchDropdownLabel = "批量操作",
}) => {
    const [data, setData] = useState([]);
    const [expandedRowKeys, setExpandedRowKeys] = useState([]);
    const [selectedRowKeys, setSelectedRowKeys] = useState([]);
    const [selectedRows, setSelectedRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: defaultPageSize,
        total: 0,
    });
    const [filterValue, setFilterValue] = useState("");
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [currentRecord, setCurrentRecord] = useState(initialValues);
    const [editingRecord, setEditingRecord] = useState(null);
    const isManualFetch = useRef(false);

    // Stable wrappers for onChange to avoid mutating React's own useState setters directly,
    // while remaining fully compatible with child components that attach validation methods to them.
    const createOnChangeRef = useRef(null);
    if (!createOnChangeRef.current) {
        createOnChangeRef.current = (val) => {
            setCurrentRecord(val);
        };
    }
    const handleCreateChange = createOnChangeRef.current;

    const editOnChangeRef = useRef(null);
    if (!editOnChangeRef.current) {
        editOnChangeRef.current = (val) => {
            setEditingRecord(val);
        };
    }
    const handleEditChange = editOnChangeRef.current;

    // Filter Logic for Header Display
    const activeFilterTags = useMemo(() => {
        if (!filterValues || !filterConfig) return [];
        return Object.entries(filterValues)
            .filter(
                ([key, value]) =>
                    value !== null &&
                    value !== undefined &&
                    value !== "" &&
                    filterConfig[key],
            )
            .map(([key, value]) => {
                const config = filterConfig[key];
                let displayValue = value;
                if (config.options) {
                    if (Array.isArray(config.options)) {
                        const opt = config.options.find(
                            (o) => String(o.value) === String(value),
                        );
                        displayValue = opt ? opt.label : value;
                    } else if (typeof config.options === "object") {
                        const opt = config.options[value];
                        displayValue = opt ? opt.label || opt : value;
                    }
                }
                return { key, label: config.label, displayValue };
            });
    }, [filterValues, filterConfig]);

    const fetchData = useCallback(
        // preserveSelection: 纯翻页（仅页码变化）时传 true 以保留多选；
        // 检索/刷新/增删改等场景不传 => 默认清空。
        async (page, rows, query, preserveSelection = false) => {
            if (!api.read) return;
            setLoading(true);
            try {
                const response = await api.read({
                    page: page - 1,
                    rows,
                    query,
                });

                if (response.data.status === 0) {
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
                    // 默认在数据重载时清空多选（检索/刷新/增删改）；
                    // 仅纯翻页（preserveSelection）时保留，配合 rowSelection 的
                    // preserveSelectedRowKeys 让跨页选择得以保留。
                    if (!preserveSelection) {
                        setSelectedRowKeys([]);
                        setSelectedRows([]);
                    }
                    if (onDataLoaded) onDataLoaded(rows);
                    setPagination((prev) => ({
                        ...prev,
                        current: page,
                        total: total,
                    }));
                } else {
                    message.error(
                        response.data?.message || `获取${entityName}列表失败`,
                    );
                }
            } catch (error) {
                console.error(`Error fetching ${entityName}:`, error);
                message.error(
                    error.response?.data?.message ||
                        `获取${entityName}数据异常`,
                );
            } finally {
                setLoading(false);
            }
        },
        [api, entityName],
    );

    useEffect(() => {
        fetchData(pagination.current, pagination.pageSize, filterValue);
    }, [fetchData, pagination.pageSize, refreshKey]);

    const handleAdd = () => {
        if (createOnChangeRef.current) {
            createOnChangeRef.current.validate = null;
        }
        setCurrentRecord(initialValues);
        setIsModalVisible(true);
    };

    const handleCancel = () => {
        setIsModalVisible(false);
        if (createOnChangeRef.current) {
            createOnChangeRef.current.validate = null;
        }
    };

    const handleCreate = async () => {
        if (
            typeof handleCreateChange.validate === "function" &&
            !handleCreateChange.validate()
        ) {
            return;
        }

        try {
            let payload = { ...currentRecord };

            // Global normalization: ensure all keys from initialValues are present and not null
            Object.keys(initialValues).forEach((key) => {
                if (payload[key] === null || payload[key] === undefined) {
                    payload[key] = initialValues[key];
                }
            });

            if (formatPayload) {
                payload = formatPayload(payload, "create");
            }

            const response = await api.create(payload);

            if (response.data.status === 0) {
                message.success(`创建${entityName}成功`);
                setIsModalVisible(false);
                if (createOnChangeRef.current) {
                    createOnChangeRef.current.validate = null;
                }
                fetchData(1, pagination.pageSize, filterValue);
            } else {
                message.error(
                    response.data?.message || `创建${entityName}失败`,
                );
            }
        } catch (error) {
            console.error(`Error creating ${entityName}:`, error);
            message.error(
                error.response?.data?.message || `创建${entityName}异常`,
            );
        }
    };

    const handleEdit = (record) => {
        if (editOnChangeRef.current) {
            editOnChangeRef.current.validate = null;
        }
        // Merge with initialValues to ensure all fields are present
        let formattedRecord = { ...initialValues, ...record };

        // Ensure that for all keys in initialValues, if the incoming record has null/undefined,
        // we use the default from initialValues
        Object.keys(initialValues).forEach((key) => {
            if (
                formattedRecord[key] === null ||
                formattedRecord[key] === undefined
            ) {
                formattedRecord[key] = initialValues[key];
            }
        });

        if (formatData) {
            formattedRecord = formatData(formattedRecord);
        }
        setEditingRecord(formattedRecord);
        setEditModalVisible(true);
    };

    const handleEditCancel = () => {
        setEditModalVisible(false);
        setEditingRecord(null);
        if (editOnChangeRef.current) {
            editOnChangeRef.current.validate = null;
        }
    };

    const handleUpdate = async () => {
        if (
            typeof handleEditChange.validate === "function" &&
            !handleEditChange.validate()
        ) {
            return;
        }

        try {
            let payload = { ...editingRecord };

            // Global normalization: ensure all keys from initialValues are present and not null
            Object.keys(initialValues).forEach((key) => {
                if (payload[key] === null || payload[key] === undefined) {
                    payload[key] = initialValues[key];
                }
            });

            if (formatPayload) {
                payload = formatPayload(payload, "update");
            }

            const response = await api.update(payload);

            if (response.data.status === 0) {
                message.success(`修改${entityName}成功`);
                setEditingRecord(null);
                setEditModalVisible(false);
                if (editOnChangeRef.current) {
                    editOnChangeRef.current.validate = null;
                }
                fetchData(pagination.current, pagination.pageSize, filterValue);
            } else {
                message.error(
                    response.data?.message || `修改${entityName}失败`,
                );
            }
        } catch (error) {
            console.error(`Error updating ${entityName}:`, error);
            if (error?.message && error?.message?.includes("改动")) {
                setEditModalVisible(false);
            }
        }
    };

    const handleDelete = async (id) => {
        try {
            const response = await api.delete({ id });
            if (response.data.status === 0) {
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
        // 仅页码变化（每页条数不变）视为"纯翻页"，此时保留多选；
        // 改变每页条数会重排数据，按普通重载处理（清空多选）。
        const pageSizeChanged = newPageSize !== pagination.pageSize;
        setPagination((prev) => ({
            ...prev,
            current: page,
            pageSize: newPageSize,
        }));
        fetchData(page, newPageSize, filterValue, !pageSizeChanged);
    };

    // fillHeight 要求表格体是独立的可滚动元素，而 rc-table 只有在 scroll.y 有值时
    // （fixHeader）才会把 header/body 拆成两个 div。具体数值无所谓——上面的 CSS 会把
    // 行内 max-height 覆盖掉，改由 flex 收缩决定实际高度。
    const mergedScroll =
        fillHeight && scroll?.y === undefined
            ? { ...scroll, y: "100%" }
            : scroll;

    const hasBatch = Array.isArray(batchActions) && batchActions.length > 0;
    // When multi-select is on AND rows carry an expandable detail panel, we hide the
    // native "+" expand column (no room next to the checkbox) and surface a
    // "显示更多" toggle inside the action column instead.
    const useShowMore = hasBatch && !!renderExpandedRow;

    const clearSelection = useCallback(() => {
        setSelectedRowKeys([]);
        setSelectedRows([]);
    }, []);

    const toggleExpand = useCallback((id) => {
        setExpandedRowKeys((prev) =>
            prev.includes(id) ? prev.filter((k) => k !== id) : [...prev, id],
        );
    }, []);

    const handleBatchClick = (action) => {
        if (!selectedRows.length) {
            message.warning("未选择任何数据");
            return;
        }
        action.onClick(selectedRows, {
            clearSelection,
            refresh: () =>
                fetchData(pagination.current, pagination.pageSize, filterValue),
        });
    };

    const rowSelection = hasBatch
        ? {
              selectedRowKeys,
              onChange: (keys, rows) => {
                  setSelectedRowKeys(keys);
                  setSelectedRows(rows);
              },
              // 跨页保留已选行的 key：服务端分页下别页的行对象由 antd 内部缓存，
              // onChange 回传的 rows 会包含其它页已选中的完整记录，供批量操作使用。
              preserveSelectedRowKeys: true,
              columnWidth: 48,
              fixed: "left",
          }
        : undefined;

    // Inline, minimal batch controls (sit on the same row as 新增/actionExtra).
    // Many actions (sample centers) collapse into a single "批量操作" dropdown.
    const batchControls = !hasBatch ? null : batchDropdown ? (
        <Dropdown
            trigger={["click"]}
            menu={{
                items: batchActions.map((a) => ({
                    key: a.key,
                    label: a.label,
                    icon: a.icon,
                    danger: a.danger,
                    disabled:
                        typeof a.disabled === "function"
                            ? a.disabled(selectedRows)
                            : a.disabled,
                })),
                onClick: ({ key }) => {
                    const action = batchActions.find((a) => a.key === key);
                    if (action) handleBatchClick(action);
                },
            }}
        >
            <Button className="font-bold bg-white">
                {batchDropdownLabel} <DownOutlined />
            </Button>
        </Dropdown>
    ) : (
        batchActions.map((a) => (
            <Button
                key={a.key}
                type={a.type || "link"}
                icon={a.icon}
                danger={a.danger}
                disabled={
                    typeof a.disabled === "function"
                        ? a.disabled(selectedRows)
                        : a.disabled
                }
                onClick={() => handleBatchClick(a)}
                className={a.className !== undefined ? a.className : "font-bold px-0"}
            >
                {a.label}
            </Button>
        ))
    );

    const actionColumn = {
        title: "操作",
        key: "action",
        fixed: "right",
        width: actionWidth,
        align: "center",
        render: (_, record) => {
            const editable =
                typeof isRecordEditable === "function"
                    ? isRecordEditable(record)
                    : true;

            const editBtn = !hideEdit && (
                <Button
                    type="link"
                    size="small"
                    onClick={() => handleEdit(record)}
                    disabled={!editable}
                    icon={
                        <EditOutlined
                            className={
                                editable ? "text-blue-500" : "text-gray-300"
                            }
                        />
                    }
                >
                    编辑
                </Button>
            );
            const deleteBtn = !hideDelete && (
                <Popconfirm
                    title={`确认要删除该${entityName}吗？`}
                    okText="确定"
                    cancelText="取消"
                    placement="left"
                    disabled={!editable}
                    onConfirm={() => handleDelete(record.id)}
                >
                    <Button
                        type="link"
                        size="small"
                        danger
                        disabled={!editable}
                        icon={
                            <DeleteOutlined
                                className={
                                    editable ? "text-red-500" : "text-gray-300"
                                }
                            />
                        }
                    >
                        删除
                    </Button>
                </Popconfirm>
            );

            const expanded = expandedRowKeys.includes(record.id);
            const showMoreBtn = useShowMore && (
                <Button
                    type="link"
                    size="small"
                    icon={expanded ? <UpOutlined /> : <DownOutlined />}
                    onClick={() => toggleExpand(record.id)}
                >
                    {expanded ? "收起" : "显示更多"}
                </Button>
            );

            return (
                <Space size="small" wrap>
                    {renderActions &&
                        renderActions(record, { handleEdit, handleDelete })}
                    {editBtn}
                    {deleteBtn}
                    {showMoreBtn}
                </Space>
            );
        },
    };

    const mergedColumns = useMemo(() => {
        // Ensure no duplicate action column and put it last
        const filtered = (columns || []).filter((col) => col.key !== "action");
        return hideAction ? filtered : [...filtered, actionColumn];
    }, [
        columns,
        renderActions,
        hideAction,
        hideEdit,
        hideDelete,
        actionWidth,
        useShowMore,
        expandedRowKeys,
    ]);

    useEffect(() => {
        if (expandAll && data.length > 0) {
            setExpandedRowKeys(data.map((item) => item.id));
        }
    }, [data, expandAll]);

    return (
        <div
            className={`flex flex-col bg-white pl-4 ${fillHeight ? "crud-table-fill " : ""}${className || "min-h-[calc(100vh-112px)]"}`}
        >
            {fillHeight && (
                <style>{`
                    /* fillHeight: 让表格体成为唯一的滚动区域，避免"外层容器 + 表格体"两条滚动条。
                       链路上每一层都是 flex 列且 flex:0 1 auto + min-height:0：
                       内容高于可用空间时逐层收缩，最终由 .ant-table-body 内部滚动，分页固定在其下方；
                       内容放得下时不发生收缩，各层保持自然高度，分页照常紧跟在表格下面。 */
                    /* 选择器里类名重复一次是为了提高优先级：调用方页面上可能存在
                       形如 .xxx-layout .ant-spin-container { flex: 1 } 的既有规则
                       （同为 0,2,0），重复类名后为 0,3,0，无需依赖样式表先后顺序。 */
                    .crud-table-fill.crud-table-fill {
                        display: flex;
                        flex-direction: column;
                        flex: 1;
                        min-height: 0;
                    }
                    /* 注意 .ant-table-wrapper > .ant-spin：antd v6 的 Spin 外层就是
                       .ant-spin（v5 的 .ant-spin-nested-loading 已不存在）。这一层默认是
                       display:block + min-height:auto，漏掉它整条收缩链就会在此断掉。 */
                    .crud-table-fill.crud-table-fill .ant-table-wrapper,
                    .crud-table-fill.crud-table-fill .ant-table-wrapper > .ant-spin,
                    .crud-table-fill.crud-table-fill .ant-spin-container,
                    .crud-table-fill.crud-table-fill .ant-table,
                    .crud-table-fill.crud-table-fill .ant-table-container {
                        display: flex;
                        flex-direction: column;
                        flex: 0 1 auto;
                        min-height: 0;
                    }
                    /* rc-table 给 body 写的是行内 maxHeight + overflowY:scroll（有数据时恒显滚动条槽），
                       这里交还给 flex 控制，并改为 auto 让"放得下就不出现滚动条"。 */
                    .crud-table-fill.crud-table-fill .ant-table-body {
                        flex: 0 1 auto;
                        min-height: 0;
                        max-height: none !important;
                        overflow-y: auto !important;
                    }
                    .crud-table-fill.crud-table-fill .ant-table-header,
                    .crud-table-fill.crud-table-fill .ant-table-pagination { flex: none; }
                `}</style>
            )}
            <div className="mb-3 flex justify-between items-center relative mt-1">
                <h1 className="text-xl font-black text-slate-800 m-0 tracking-tight">
                    {title}
                </h1>

                {/* Active Filters Display - Centered in Title Row */}
                <div className="absolute left-1/2 -translate-x-1/2 flex justify-center items-center pointer-events-none">
                    <div className="pointer-events-auto">
                        {activeFilterTags.length > 0 && (
                            <Space
                                size="middle"
                                className="bg-slate-50/50 px-4 py-1.5 rounded-2xl border border-slate-100 shadow-sm"
                            >
                                <span className="text-slate-400 text-[12px] uppercase tracking-[0.2em] font-black mr-1">
                                    当前筛选
                                </span>
                                <Space
                                    size="small"
                                    className="flex-wrap justify-center"
                                >
                                    {activeFilterTags.map((tag) => (
                                        <Tag
                                            key={tag.key}
                                            closable
                                            onClose={(e) => {
                                                e.preventDefault();
                                                onClearFilter &&
                                                    onClearFilter(tag.key);
                                            }}
                                            className="bg-white border-slate-200 text-slate-700 rounded-xl px-3 py-1 text-sm m-0 flex items-center gap-1.5 shadow-xs hover:border-blue-300 transition-colors"
                                        >
                                            <span className="text-slate-400 font-medium">
                                                {tag.label}:
                                            </span>
                                            <span className="font-bold text-blue-600">
                                                {tag.displayValue}
                                            </span>
                                        </Tag>
                                    ))}
                                    {activeFilterTags.length > 1 && (
                                        <Button
                                            type="link"
                                            size="small"
                                            danger
                                            onClick={onClearAll}
                                            className="text-xs h-auto p-0 ml-2 hover:underline font-bold"
                                        >
                                            清空全部
                                        </Button>
                                    )}
                                </Space>
                            </Space>
                        )}
                    </div>
                </div>

                {headerExtra}
            </div>

            <div className="flex justify-between items-center mb-2 min-h-[32px]">
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

                <div className="flex-1" />

                <Space wrap>
                    {actionExtra}
                    {batchControls}
                    {!hideAdd && (
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={handleAdd}
                        >
                            新增{entityName}
                        </Button>
                    )}
                </Space>
            </div>

            <Table
                columns={mergedColumns}
                dataSource={data}
                rowSelection={rowSelection}
                pagination={{
                    total: pagination.total,
                    current: pagination.current,
                    pageSize: pagination.pageSize,
                    showSizeChanger: true,
                    pageSizeOptions: ["10", "20", "50", "100"],
                    showQuickJumper: true,
                    showTotal: (total, range) =>
                        `显示 ${range[0]}-${range[1]} / 共 ${total} 项`,
                }}
                onChange={(paginationConfig) => {
                    if (isManualFetch.current) {
                        isManualFetch.current = false;
                        return;
                    }
                    if (
                        paginationConfig.current !== pagination.current ||
                        paginationConfig.pageSize !== pagination.pageSize
                    ) {
                        handleTableChange(
                            paginationConfig.current,
                            paginationConfig.pageSize,
                        );
                    }
                }}
                loading={loading}
                rowKey="id"
                bordered
                size="small"
                className="mt-2"
                scroll={mergedScroll}
                expandable={
                    renderExpandedRow
                        ? {
                              expandedRowRender: renderExpandedRow,
                              expandedRowKeys: expandedRowKeys,
                              onExpandedRowsChange: (keys) =>
                                  !expandAll && setExpandedRowKeys(keys),
                              // Hide the native "+" column when the action-column
                              // "显示更多" toggle is in charge (multi-select mode).
                              showExpandColumn: useShowMore
                                  ? false
                                  : !expandAll,
                          }
                        : tableProps.expandable
                }
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
                            {...{
                                [entityName.toLowerCase() || "record"]:
                                    currentRecord,
                            }} // Dynamic prop name
                            record={currentRecord} // Fallback consistent name
                            onChange={handleCreateChange}
                            tableData={data}
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
                            {...{
                                [entityName.toLowerCase() || "record"]:
                                    editingRecord,
                            }}
                            record={editingRecord}
                            onChange={handleEditChange}
                            tableData={data}
                        />
                    )}
                </div>
            </Modal>
        </div>
    );
};

export default CrudTable;
