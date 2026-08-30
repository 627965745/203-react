import React from "react";
import { Tag, Empty } from "antd";
// 设备用仪表盘图标（量测仪器）—— ExperimentOutlined 是锥形瓶，那是试剂/实验的语义
import { DashboardOutlined, CalendarOutlined } from "@ant-design/icons";
import { getExperimentedAt } from "../../utils";

// V6: 检测结果的只读展示件，供「查看数据」(ResultEntryModal 只读态) 与「实验数据审核」
//     (ReviewModal) 共用，保证两处的视觉语言一致。
//
//     结果对象上与本文件相关的字段：
//       · name / value        —— 结果字段名与录入值
//       · device_id / device_name —— V5 起每条结果记录所用设备
//       · experimented_at     —— V6 起的实验时间；后端 read 响应实际拼作 exprimented_at，
//                                统一走 utils 的 getExperimentedAt 读取
//
//     设备与实验时间在「逐字段录入」时是全字段共用的，但 Excel 批量导入允许逐字段指定设备，
//     所以先判断整组结果是否一致：一致就提到方法级只显示一行（省空间）；不一致才回落到
//     逐字段展示，避免用一台设备的名字冒充另一台。

const deviceLabelOf = (result) =>
    result?.device_name || (result?.device_id ? `#${result.device_id}` : null);

const summarizeResultMeta = (results = []) => {
    const devices = new Set(results.map((r) => deviceLabelOf(r) ?? ""));
    const dates = new Set(results.map((r) => getExperimentedAt(r) ?? ""));
    return {
        deviceVaries: devices.size > 1,
        dateVaries: dates.size > 1,
        device: devices.size === 1 ? deviceLabelOf(results[0]) : null,
        date: dates.size === 1 ? getExperimentedAt(results[0]) : null,
    };
};

// 一个「图标 + 标签 + 值」的紧凑元信息块
const MetaField = ({ icon, label, value }) => (
    <div className="flex flex-col min-w-0">
        <span className="text-[10px] text-slate-400">{label}</span>
        <span className="flex items-center gap-1.5 min-w-0">
            {icon}
            <span className="font-bold text-slate-700 truncate text-[13px]">
                {value || <span className="text-slate-300 font-normal">未记录</span>}
            </span>
        </span>
    </div>
);

/**
 * 单个结果字段自己的「设备 / 实验时间」小标签。只在整组结果不一致时才需要，
 * 由调用方通过 summarizeResultMeta 判断后传入 showDevice / showDate。
 */
export const ResultFieldMetaTags = ({ result, showDevice, showDate }) => {
    if (!showDevice && !showDate) return null;
    return (
        <div className="mt-1 flex flex-wrap gap-1">
            {showDevice && (
                <Tag icon={<DashboardOutlined />} className="m-0 text-[10px] bg-white">
                    {deviceLabelOf(result) || "未记录设备"}
                </Tag>
            )}
            {showDate && (
                <Tag icon={<CalendarOutlined />} className="m-0 text-[10px] bg-white">
                    {getExperimentedAt(result) || "未记录时间"}
                </Tag>
            )}
        </div>
    );
};

/**
 * 整组结果的设备/实验时间是否需要逐字段展示。供「查看数据」那种自行渲染字段的界面判断。
 * 普通函数，不是 hook —— 刻意不用 use 前缀，免得被当成 hook 受调用位置限制。
 */
export const getResultMetaVariance = (results = []) => {
    const meta = summarizeResultMeta(results);
    return { deviceVaries: meta.deviceVaries, dateVaries: meta.dateVaries };
};

/**
 * 方法级的「检测设备 / 实验时间」行。整组结果一致时才在这里显示具体值，
 * 否则提示"各字段不同"并由 ResultFieldGrid 逐字段展示。
 */
export const ResultMetaRow = ({ results = [], className = "" }) => {
    const meta = summarizeResultMeta(results);
    // 不一致的那一项整块不渲染 —— 具体值由字段下方的标注给出，方法级再放一句
    // "各字段不同" 只是占地方不给信息。两项都不一致时整行消失。
    if (meta.deviceVaries && meta.dateVaries) return null;
    return (
        <div className={`grid grid-cols-2 gap-4 ${className}`}>
            {!meta.deviceVaries && (
                <MetaField
                    icon={<DashboardOutlined className="text-slate-400 shrink-0" />}
                    label="检测设备"
                    value={meta.device}
                />
            )}
            {!meta.dateVaries && (
                <MetaField
                    icon={<CalendarOutlined className="text-slate-400 shrink-0" />}
                    label="实验时间"
                    value={meta.date}
                />
            )}
        </div>
    );
};

/**
 * 结果字段网格。默认两列；值较长的字段自动占满整行，避免窄列里挤成一条竖着的文字。
 *
 * 设备与实验时间的展示：
 *   · 默认（alwaysShowMeta=false）—— 只在整组结果不一致时才逐字段标注，一致时由调用方
 *     用 ResultMetaRow 在方法级显示一行即可，省地方。
 *   · V6.1 审核界面传 alwaysShowMeta —— 审核人要逐条核对"这个值是哪台仪器、哪天做的"，
 *     所以不管一致与否都在每个字段下面标出来，方法级那一行反而不要了。
 */
export const ResultFieldGrid = ({
    results = [],
    emptyText = "暂无录入数据",
    alwaysShowMeta = false,
}) => {
    if (!results || results.length === 0) {
        return (
            <div className="py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={
                        <span className="text-slate-400 text-xs">
                            {emptyText}
                        </span>
                    }
                />
            </div>
        );
    }

    const meta = summarizeResultMeta(results);
    const showDevice = alwaysShowMeta || meta.deviceVaries;
    const showDate = alwaysShowMeta || meta.dateVaries;

    return (
        <div className="grid grid-cols-2 gap-3">
            {results.map((r, i) => {
                const valStr = r.value == null ? "" : String(r.value);
                // 长文本独占一行，短值两列并排 —— 让宽度用在真正需要的字段上
                const wide = valStr.length > 32 || valStr.includes("\n");
                return (
                    <div
                        key={r.field_id || r.id || i}
                        className={`min-w-0 ${wide ? "col-span-2" : ""}`}
                    >
                        <div className="text-[11px] font-bold text-slate-500 mb-1 truncate">
                            {r.name}
                        </div>
                        <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-bold break-words whitespace-pre-wrap">
                            {valStr || (
                                <span className="text-slate-300 font-normal">
                                    —
                                </span>
                            )}
                        </div>
                        <ResultFieldMetaTags
                            result={r}
                            showDevice={showDevice}
                            showDate={showDate}
                        />
                    </div>
                );
            })}
        </div>
    );
};
