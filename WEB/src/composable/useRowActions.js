import hasPermission from "@/utils/hasPermission";

export function useRowActions(emit, props, { t, showDialog, debounce, DEBOUNCE_DELAY }) {

    const askAction = (emitName, message) => async (item) => {
        const result = await showDialog({
            title: t(message),
            icon: "delete",
            confirmColor: "error",
        });
        if (result) emit(emitName, item);
    };

    const deleteAction = (emitName, message) => async (item) => {
        const result = await showDialog({
            title: t(message),
            icon: "delete",
            confirmColor: "error",
            confirmText: "Delete",
        });
        if (result) emit(emitName, item);
    };



    const actionHandlers = {
        request: askAction("onRequest", "Do you want to request loan for this client?"),
        delete: deleteAction("onDelete", "Are you sure you want to delete? Deleted data cannot be recovered."),
        add: debounce((item) => emit("onAdd", item), DEBOUNCE_DELAY),
        attendance: debounce((item) => emit("onAttendance", item), DEBOUNCE_DELAY),
        view: debounce((item) => emit("onView", item), DEBOUNCE_DELAY),
        detail: debounce((item) => emit("onDetail", item), DEBOUNCE_DELAY),
        schedule: debounce((item) => emit("onSchedule", item), DEBOUNCE_DELAY),
        edit: debounce((item) => emit("onEdit", item), DEBOUNCE_DELAY),
        approve: debounce((item) => emit("onApprove", item), DEBOUNCE_DELAY),
        receive: debounce((item) => emit("onReceive", item), DEBOUNCE_DELAY),
        receiveHistory: debounce((item) => emit("onReceiveHistory", item), DEBOUNCE_DELAY),
        clientHistory: debounce((item) => emit("onClientHistory", item), DEBOUNCE_DELAY),
        penalty: debounce((item) => emit("onPenalty", item), DEBOUNCE_DELAY),
        accept: debounce((item) => emit("onAccept", item), DEBOUNCE_DELAY),
        rollback: askAction("onRollback", "Rollback Item?"),
        restructure: debounce((item) => emit("onRestructure", item), DEBOUNCE_DELAY),
        lock: debounce((item) => emit("onDisable", item), DEBOUNCE_DELAY),
        default: debounce((item) => emit("onDefault", item), DEBOUNCE_DELAY),
        linkUser: debounce((item) => emit("onLinkUser", item), DEBOUNCE_DELAY),
        password: debounce((item) => emit("onPassword", item), DEBOUNCE_DELAY),
        username: debounce((item) => emit("onUsername", item), DEBOUNCE_DELAY),
        permission: debounce((item) => emit("onPermission", item), DEBOUNCE_DELAY),
        blackList: askAction("onBlackList", "Do you want to make this client to black list?"),
    };

    const actionButtons = [
        {
            title: "Request Loan",
            value: "request",
            icon: "tabler-file-pencil",
            color: "success",
            permission: props?.canRequest,
            show: props?.isRequest,
            action: actionHandlers.request,
            btn: props?.btnRequest,
            condition: props?.requestCondition || ((item) => true),
        },
        {
            title: "Approve",
            value: "approve",
            icon: "tabler-check",
            color: "success",
            permission: props?.canApprove,
            show: props?.isApprove,
            action: actionHandlers.approve,
            btn: props?.btnApprove,
            condition: props?.approveCondition || ((item) => true),
        },
        {
            title: "Default",
            value: "default",
            icon: "tabler-circuit-capacitor",
            color: "secondary",
            permission: props?.canDefault,
            show: props?.isDefault,
            action: actionHandlers.default,
            checkDefault: true,
            firstColor: "success",
            secondColor: "secondary",
            btn: props?.btnDefault,
        },
        {
            title: "Disable",
            value: "disable",
            icon: "tabler-cancel",
            color: "secondary",
            permission: props?.canDisable,
            show: props?.isDisable,
            action: actionHandlers.lock,
            checkActive: true,
            checkIcon: true,
            checkTitle: true,
            firstColor: "success",
            secondColor: "error",
            firstTitle: "Active",
            secondTitle: "Inactive",
            firstIcon: "tabler-check",
            secondIcon: "tabler-cancel",
            btn: props?.btnDisable,
        },
        {
            title: "Link User",
            value: "link-user",
            icon: "tabler-link",
            color: "success",
            permission: props?.canLinkUser,
            show: props?.isLinkUser,
            action: actionHandlers.linkUser,
            btn: props?.btnLinkUser,
        },
        {
            title: "Password",
            value: "password",
            icon: "tabler-key",
            color: "secondary",
            permission: props?.canPassword,
            show: props?.isPassword,
            action: actionHandlers.password,
            btn: props?.btnPassword,
        },
        {
            title: "Username",
            value: "username",
            icon: "tabler-user",
            color: "success",
            permission: props?.canUsername,
            show: props?.isUsername,
            action: actionHandlers.username,
            btn: props?.btnUsername,
        },
        {
            title: "Receive",
            value: "receive",
            icon: "tabler-cash-banknote",
            color: "success",
            permission: props?.canReceive,
            show: props?.isReceive,
            action: actionHandlers.receive,
            btn: props?.btnReceive,
        },
        {
            title: "Add",
            value: "add",
            icon: "tabler-plus",
            color: "warning",
            // permission: props?.canAdd,
            show: props?.isAdd,
            action: actionHandlers.add,
            btn: props?.btnAdd,
        },

        {
            title: "Attendance",
            value: "attendance",
            icon: "tabler-file-check",
            color: "primary",
            // permission: props?.canAdd,
            show: props?.isAttendance,
            action: actionHandlers.attendance,
            btn: props?.btnAttendance,
        },

        {
            title: "View",
            value: "view",
            icon: "tabler-eye",
            color: "success",
            permission: props?.canView,
            show: props?.isView,
            action: actionHandlers.view,
            btn: props?.btnView,
        },
        {
            title: "Detail",
            value: "detail",
            icon: "tabler-file-description",
            color: "success",
            permission: props?.canDetail,
            show: props?.isDetail,
            action: actionHandlers.detail,
            btn: props?.btnDetail,
        },
        {
            title: "Schedule",
            value: "schedule",
            icon: "tabler-calendar-event",
            color: "warning",
            permission: props?.canSchedule,
            show: props?.isSchedule,
            action: actionHandlers.schedule,
            btn: props?.btnSchedule,
            condition: props?.scheduleCondition || ((item) => true),
        },
        {
            title: "Client History",
            value: "client-history",
            icon: "tabler-user-search",
            color: "success",
            permission: props?.canClientistory,
            show: props?.isClientHistory,
            action: actionHandlers.clientHistory,
            btn: props?.btnClientHistory,
        },
        {
            title: "Black List",
            value: "black_list",
            icon: "tabler-cancel",
            color: "error",
            permission: [props?.canCheckBlackList, props?.canUncheckBlackList],
            show: props?.isBlackList,
            action: actionHandlers.blackList,
            checkBlackList: true,
            checkBleckListPermission: true,
            checkIcon: true,
            firstColor: "error",
            secondColor: "secondary",
            firstIcon: "tabler-address-book-off",
            secondIcon: "tabler-address-book",
            btn: props?.btnBlackList,
        },
        {
            title: "Receive History",
            value: "receive-history",
            icon: "tabler-history",
            color: "success",
            permission: props?.canLoan,
            show: props?.isReceiveHistory,
            action: actionHandlers.receiveHistory,
            btn: props?.btnReceiveHistory,
        },



        {
            title: "Penalty",
            value: "penalty",
            icon: "tabler-coin",
            color: "warning",
            permission: props?.canPenalty,
            show: props?.isPenalty,
            action: actionHandlers.penalty,
            btn: props?.btnPenalty,
        },
        {
            title: "Restructure",
            value: "restructure",
            icon: "tabler-calendar-event",
            color: "warning",
            permission: props?.canRestructure,
            show: props?.isRestructure,
            action: actionHandlers.restructure,
            btn: props?.btnRestructure,
        },

        {
            title: "Permission",
            value: "edit",
            icon: "tabler-shield",
            color: "warning",
            permission: props?.canPermission,
            show: props?.isPermission,
            action: actionHandlers.permission,
            btn: props?.btnPermission,
        },
        {
            title: "Edit",
            value: "edit",
            icon: "tabler-pencil",
            color: "warning",
            permission: props?.canEdit,
            show: props?.isEdit,
            action: actionHandlers.edit,
            btn: props?.btnEdit,
        },
        {
            title: "Rollback",
            value: "rollback",
            icon: "tabler-arrow-back-up",
            color: "error",
            permission: props?.canRollback,
            show: props?.isRollback,
            action: actionHandlers.rollback,
            btn: props?.btnRollback,
            condition: props?.rollbackCondition || ((item) => true),
        },
        {
            title: "Delete",
            value: "delete",
            icon: "tabler-trash",
            color: "error",
            permission: props?.canDelete,
            show: props?.isDelete,
            action: actionHandlers.delete,
            btn: props?.btnDelete,
            isDelete: true,
        },
    ];

    return { actionHandlers, actionButtons };
};

export const dataTableProps = {

    isRequest: Boolean,
    btnRequest: String,
    canRequest: String,
    requestCondition: {
        type: [Function, Boolean],
        default: null,
    },

    isDelete: Boolean,
    btnDelete: Boolean,
    canDelete: String,

    isEdit: Boolean,
    btnEdit: String,
    canEdit: String,

    isPrint: Boolean,
    btnPrint: Boolean,
    canPrint: String,

    isReceive: Boolean,
    btnReceive: Boolean,
    canReceive: String,

    isReceiveHistory: Boolean,
    btnReceiveHistory: Boolean,

    isClientHistory: Boolean,
    btnClientHistory: Boolean,
    canClientHistory: String,

    isView: Boolean,
    btnView: Boolean,
    canView: String,

    isAdd: Boolean,
    btnAdd: Boolean,
    canAdd: String,

    isAttendance: Boolean,
    btnAttendance: Boolean,
    canAttendace: String,


    isDetail: Boolean,
    btnDetail: Boolean,
    canDetail: String,

    isSchedule: Boolean,
    btnSchedule: Boolean,
    canSchedule: String,
    scheduleCondition: {
        type: [Function, Boolean],
        default: null,
    },

    isApprove: Boolean,
    btnApprove: Boolean,
    canApprove: String,
    approveCondition: {
        type: [Function, Boolean],
        default: null,
    },

    isBlackList: Boolean,
    btnBlackList: Boolean,
    canCheckBlackList: String,
    canUncheckBlackList: String,

    isAccept: Boolean,
    btnAccept: Boolean,
    canAccept: String,

    isPenalty: Boolean,
    btnPenalty: Boolean,
    canPenalty: String,

    isRollback: Boolean,
    btnRollback: Boolean,
    canRollback: String,
    rollbackCondition: {
        type: [Function, Boolean],
        default: null,
    },

    isRestructure: Boolean,
    btnRestructure: Boolean,
    canRestructure: String,

    isDisable: Boolean,
    btnDisable: Boolean,
    canDisable: String,

    isDefault: Boolean,
    btnDefault: Boolean,
    canDefault: String,

    isPassword: Boolean,
    btnPassword: Boolean,
    canPassword: String,

    isLinkUser: Boolean,
    btnLinkUser: Boolean,
    canLinkUser: String,

    isUsername: Boolean,
    btnUsername: Boolean,
    canUsername: String,

    isPermission: Boolean,
    btnPermission: Boolean,
    canPermission: String,

    isMoreAction: { type: Boolean, default: true },
    isMoreActionCondition: {
        type: [Function, Boolean],
        default: null,
    },
};

export const dataTableEmits = [
    "onApprove",
    "onAccept",
    "onDelete",
    "onAdd",
    "onAttendance",
    "onView",
    "onDetail",
    "onReceive",
    "onReceiveHistory",
    "onClientHistory",
    "onEdit",
    "onRequest",
    "onLinkUser",
    "onBlackList",
    "onPenalty",
    "onPrint",
    "onDisable",
    "onRollback",
    "onPassword",
    "onUsername",
    "onPermission",
    "onPaginate",
    "onDefault",
    "onSchedule",
    "onRestructure",
];

export const getButtonColor = (button, item) => {
    if (button.checkBlackList) return item.is_black_list ? button.firstColor : button.secondColor;
    if (button.checkActive)
        return item.is_active ? button.firstColor : button.secondColor;
    if (button.checkDefault) return item.default ? button.firstColor : button.secondColor;
    return button.color;
};

export const getButtonTitle = (button, item) => {
    if (button.checkTitle) {
        return item.is_active ? button.firstTitle : button.secondTitle;
    }
    return button.title;
};

export const getButtonIcon = (button, item) => {
    if (button.checkBlackList) {
        return item.is_black_list ? button.firstIcon : button.secondIcon;
    }
    if (button.checkIcon) {
        return item.is_active ? button.firstIcon : button.secondIcon;
    }
    return button.icon;
};

export const checkPermission = (button, item) => {
    if (button.checkBleckListPermission) {
        return item.is_black_list ? hasPermission(button.permission[1]) : hasPermission(button.permission[0]);
    }
    return hasPermission(button.permission);
};