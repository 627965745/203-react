import React, { useState, useEffect, useRef, useMemo } from "react";
import { Cascader, Spin, Button, Input, Checkbox, Empty } from "antd";
import { PlusOutlined, CloseOutlined, SearchOutlined } from "@ant-design/icons";
import { relationTestMethod } from "../../api/testMethod";

// V3: item 与 method 强绑定 —— 选择检测方法时必须同时指定其所属检测项目，
//     不再有独立的"建议方法(来自样品已加项目)/全部方法"两栏选择。
// 级联结构：分类 > 检测项目 > 检测方法，由 relationTestMethod() 一次性返回三级数据
// [{ id, name, items: [{ id, name, methods: [{ id, name }] }] }]，不再需要展开项目时
// 懒加载 TestItem/method（该接口现已不返回 processing_options，也不再用于此处）。
// 分类/项目节点不可勾选也不展示勾选框（仅用于展开），只有方法叶子可勾选；
// 叶子路径 [分类value, itemId, methodId] 对应外部值 { item_id, method_id }。
//
// 交互为"添加"按钮 + 内联级联面板（非下拉弹层），已勾选的方法在面板上方按行展示。
// 面板顶部提供关键字搜索：有输入时切换为跨"分类/项目/方法"三级关键字匹配的扁平列表
// （数据已一次性全部加载，搜索直接在前端过滤，无需再次请求）。
const MethodSelector = ({
    value = [],
    onChange,
    disabledPairs = [],
    disabled = false,
}) => {
    const [options, setOptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [panelOpen, setPanelOpen] = useState(false);
    const [keyword, setKeyword] = useState("");
    const itemCatMap = useRef(new Map()); // itemId -> 分类 value，用于把外部 {item_id,method_id} 还原为完整级联路径
    const itemNameMap = useRef(new Map()); // itemId -> item name
    const methodNameMap = useRef(new Map()); // "itemId-methodId" -> method name，用于渲染上方已选列表

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        const disabledSet = new Set(disabledPairs);
        relationTestMethod()
            .then((res) => {
                if (cancelled) return;
                const cats = res.data?.data || [];
                itemCatMap.current = new Map();
                itemNameMap.current = new Map();
                methodNameMap.current = new Map();
                setOptions(
                    cats.map((cat) => {
                        const catValue = `cat-${cat.id}`;
                        return {
                            label: cat.name,
                            value: catValue,
                            isLeaf: false,
                            disableCheckbox: true,
                            children: (cat.items || []).map((item) => {
                                itemCatMap.current.set(item.id, catValue);
                                itemNameMap.current.set(item.id, item.name);
                                return {
                                    label: item.name,
                                    value: item.id,
                                    isLeaf: false,
                                    disableCheckbox: true,
                                    children: (item.methods || []).map((m) => {
                                        const key = `${item.id}-${m.id}`;
                                        const isDisabled = disabledSet.has(key);
                                        methodNameMap.current.set(key, m.name);
                                        return {
                                            label: m.name + (isDisabled ? " (已添加)" : ""),
                                            value: m.id,
                                            isLeaf: true,
                                            disabled: isDisabled,
                                        };
                                    }),
                                };
                            }),
                        };
                    }),
                );
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // 搜索用的扁平方法列表，从已加载的三级 options 派生
    const flatMethods = useMemo(() => {
        const out = [];
        options.forEach((cat) => {
            (cat.children || []).forEach((item) => {
                (item.children || []).forEach((m) => {
                    out.push({
                        catLabel: cat.label,
                        itemLabel: item.label,
                        itemId: item.value,
                        methodId: m.value,
                        methodLabel: methodNameMap.current.get(`${item.value}-${m.value}`) || m.label,
                        disabled: m.disabled,
                    });
                });
            });
        });
        return out;
    }, [options]);

    const searchResults = useMemo(() => {
        const kw = keyword.trim().toLowerCase();
        if (!kw) return null;
        return flatMethods.filter(
            (m) =>
                m.catLabel.toLowerCase().includes(kw) ||
                m.itemLabel.toLowerCase().includes(kw) ||
                m.methodLabel.toLowerCase().includes(kw),
        );
    }, [flatMethods, keyword]);

    const cascaderValue = value
        .map((pair) => {
            const catValue = itemCatMap.current.get(pair.item_id);
            return catValue != null ? [catValue, pair.item_id, pair.method_id] : null;
        })
        .filter(Boolean);

    const handleChange = (paths) => {
        const pairs = (paths || [])
            .filter((p) => p.length === 3)
            .map((p) => ({ item_id: p[1], method_id: p[2] }));
        onChange?.(pairs);
    };

    const removePair = (pair) => {
        onChange?.(value.filter((v) => !(v.item_id === pair.item_id && v.method_id === pair.method_id)));
    };

    const selectedKeySet = useMemo(
        () => new Set(value.map((v) => `${v.item_id}-${v.method_id}`)),
        [value],
    );

    const toggleSearchResult = (m) => {
        const key = `${m.itemId}-${m.methodId}`;
        if (selectedKeySet.has(key)) {
            onChange?.(value.filter((v) => `${v.item_id}-${v.method_id}` !== key));
        } else {
            onChange?.([...value, { item_id: m.itemId, method_id: m.methodId }]);
        }
    };

    return (
        <div>
            {value.length > 0 && (
                <div className="mb-2 space-y-1.5">
                    {value.map((pair) => {
                        const key = `${pair.item_id}-${pair.method_id}`;
                        const itemName = itemNameMap.current.get(pair.item_id) || `#${pair.item_id}`;
                        const methodName = methodNameMap.current.get(key) || `#${pair.method_id}`;
                        return (
                            <div
                                key={key}
                                className="flex items-center justify-between gap-2 bg-slate-50 border border-slate-100 rounded-lg pl-3 pr-1 py-1.5"
                            >
                                <span className="text-sm text-slate-700 min-w-0 truncate">
                                    <span className="text-blue-500 font-bold">{itemName}</span>
                                    <span className="text-slate-300 mx-1.5">/</span>
                                    {methodName}
                                </span>
                                {!disabled && (
                                    <Button
                                        type="text"
                                        size="small"
                                        icon={<CloseOutlined />}
                                        onClick={() => removePair(pair)}
                                        className="rounded-md shrink-0"
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {!panelOpen && (
                <Button
                    type="dashed"
                    block
                    icon={<PlusOutlined />}
                    disabled={disabled}
                    onClick={() => setPanelOpen(true)}
                >
                    添加检测方法
                </Button>
            )}

            {panelOpen && (
                loading ? (
                    <div className="py-4 text-center border border-slate-100 rounded-xl"><Spin size="small" /></div>
                ) : (
                    <div className="method-selector-panel border border-slate-200 rounded-xl overflow-hidden">
                        <div className="p-2 border-b border-slate-100">
                            <Input
                                allowClear
                                disabled={disabled}
                                prefix={<SearchOutlined className="text-slate-300" />}
                                placeholder="搜索分类/项目/方法关键字"
                                value={keyword}
                                onChange={(e) => setKeyword(e.target.value)}
                            />
                        </div>
                        {searchResults ? (
                            <div className="max-h-[260px] overflow-y-auto p-2 space-y-0.5">
                                {searchResults.length === 0 ? (
                                    <Empty
                                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                                        description="无匹配结果"
                                        className="py-6"
                                    />
                                ) : (
                                    searchResults.map((m) => {
                                        const key = `${m.itemId}-${m.methodId}`;
                                        return (
                                            <div
                                                key={key}
                                                className="flex items-center px-2 py-1.5 rounded-lg hover:bg-slate-50"
                                            >
                                                <Checkbox
                                                    checked={selectedKeySet.has(key)}
                                                    disabled={disabled || m.disabled}
                                                    onChange={() => toggleSearchResult(m)}
                                                >
                                                    <span className="text-sm text-slate-700">
                                                        <span className="text-blue-500 font-bold">{m.itemLabel}</span>
                                                        <span className="text-slate-300 mx-1.5">/</span>
                                                        {m.methodLabel}
                                                        {m.disabled && (
                                                            <span className="text-slate-300 ml-1">(已添加)</span>
                                                        )}
                                                    </span>
                                                </Checkbox>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        ) : (
                            <Cascader.Panel
                                options={options}
                                value={cascaderValue}
                                onChange={handleChange}
                                multiple
                                disabled={disabled}
                            />
                        )}
                    </div>
                )
            )}

            <style>{`
                .method-selector-panel .ant-cascader-menu {
                    height: 260px;
                }
                .method-selector-panel .ant-cascader-menu-item-expand .ant-cascader-checkbox {
                    display: none;
                }
            `}</style>
        </div>
    );
};

export default MethodSelector;
