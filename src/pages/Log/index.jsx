import React, { useState, useMemo, useEffect } from "react";
import { Select, Space, Tag, Modal, Button } from "antd";
import { EyeOutlined } from "@ant-design/icons";
import CrudTable from "../../components/CrudTable";
import { readLog } from "../../api/log";
import { comboDepartment } from "../../api/department";
import { comboUser } from "../../api/user";

const LogList = () => {
    const [filters, setFilters] = useState({
        department_id: null,
        user_id: null,
    });
    const [refreshKey, setRefreshKey] = useState(0);
    const [departments, setDepartments] = useState([]);
    const [users, setUsers] = useState([]);

    useEffect(() => {
        const fetchCombos = async () => {
            try {
                const depRes = await comboDepartment({});
                if (depRes.data.code === 0 || depRes.data.status === 0) {
                    setDepartments((depRes.data.data || []).map(d => ({ label: d.name, value: d.id })));
                }
                const usrRes = await comboUser({});
                if (usrRes.data.code === 0 || usrRes.data.status === 0) {
                    setUsers((usrRes.data.data || []).map(u => ({ label: u.name, value: u.id })));
                }
            } catch (err) {
                console.error("Error fetching combos", err);
            }
        };
        fetchCombos();
    }, []);

    const columns = [
        {
            title: "序号",
            dataIndex: "id",
            width: "5%",
            align: "center",
        },
        {
            title: "用户",
            width: "12%",
            render: (_, record) => (
                <div className="flex flex-col">
                    <span className="font-medium text-blue-600">{record.user_nickname || "-"}</span>
                    <span className="text-xs text-gray-500">{record.department_name || "-"}</span>
                </div>
            )
        },
        {
            title: "请求路由",
            dataIndex: "route",
            width: "25%",
            render: (val) => <span className="font-mono text-xs">{val}</span>
        },
        {
            title: "状态",
            dataIndex: "response_status",
            width: "8%",
            align: "center",
            render: (val) => {
                let color = "default";
                if (val === 0) color = "success";
                else if (val > 0) color = "error";
                return <Tag color={color}>{val}</Tag>;
            }
        },
        {
            title: "请求参数",
            dataIndex: "request_data",
            width: "10%",
            align: "center",
            render: (val) => {
                if (!val || val === "{}") return <span className="text-gray-400">-</span>;
                return (
                    <Button 
                        type="link" 
                        size="small" 
                        icon={<EyeOutlined />}
                        onClick={() => {
                            let content = val;
                            try {
                                content = JSON.stringify(JSON.parse(val), null, 2);
                            } catch (e) {}
                            Modal.info({
                                title: "请求参数详情",
                                width: 600,
                                content: (
                                    <pre className="bg-gray-100 p-4 rounded mt-4 max-h-96 overflow-auto text-xs">
                                        {content}
                                    </pre>
                                ),
                                maskClosable: true
                            });
                        }}
                    >
                        查看
                    </Button>
                );
            }
        },
        {
            title: "操作时间",
            dataIndex: "created_at",
            width: "15%",
        }
    ];

    const api = useMemo(() => ({
        read: (params) => readLog({ ...params, ...filters }),
    }), [filters]);

    const updateFilter = (field, value) => {
        setFilters(prev => ({ ...prev, [field]: value }));
        setRefreshKey(prev => prev + 1);
    };

    return (
        <CrudTable
            refreshKey={refreshKey}
            title="操作日志"
            entityName="日志"
            columns={columns}
            api={api}
            hideAdd={true}
            hideAction={true} // Hide action column using the newly added prop
            hideSearch={true} // Read API doesn't specify query search for Log
            tableProps={{ size: "small" }}
            filterValues={filters}
            filterConfig={{
                department_id: { label: "部门", options: departments },
                user_id: { label: "用户", options: users }
            }}
            onClearFilter={(key) => updateFilter(key, null)}
            onClearAll={() => setFilters({ department_id: null, user_id: null })}
            actionExtra={
                <Space wrap>
                    <Select
                        style={{ width: 160 }}
                        placeholder="部门筛选"
                        allowClear
                        showSearch
                        optionFilterProp="label"
                        value={filters.department_id}
                        onChange={(val) => updateFilter("department_id", val)}
                        options={departments}
                    />
                    <Select
                        style={{ width: 160 }}
                        placeholder="用户筛选"
                        allowClear
                        showSearch
                        optionFilterProp="label"
                        value={filters.user_id}
                        onChange={(val) => updateFilter("user_id", val)}
                        options={users}
                    />
                </Space>
            }
        />
    );
};

export default LogList;
