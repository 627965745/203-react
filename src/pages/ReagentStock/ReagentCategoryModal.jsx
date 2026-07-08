import { Modal } from "antd";
import ReagentAddEdit from "../Reagent/AddEdit";

const ReagentCategoryModal = ({ reagentModal, onCancel, onSubmit, onChange }) => {
    return (
        <Modal
            title={reagentModal.record?.id ? "编辑试剂定义" : "新增试剂定义"}
            open={reagentModal.visible}
            onCancel={onCancel}
            onOk={onSubmit}
            okText="保存配置"
            cancelText="取消"
            width={500}
            destroyOnHidden
        >
            <div className="pt-4">
                <ReagentAddEdit
                    record={reagentModal.record}
                    onChange={onChange}
                />
            </div>
        </Modal>
    );
};

export default ReagentCategoryModal;
