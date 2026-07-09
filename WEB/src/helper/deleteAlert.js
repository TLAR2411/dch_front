import Swal from "sweetalert2";

const DeleteAlert = async (apiCall) => {
    try {
        const result = await Swal.fire({
            title: "Are you sure you want to delete?",
            text: "Deleted data cannot be recovered.",
            showCancelButton: true,
            confirmButtonColor: "#ED5E68",
            cancelButtonColor: "#ebecf0",
            confirmButtonText: "បាទ/ចា៎, លុប",
            cancelButtonText: "បោះបង់",
            customClass: {
                popup: "colored-toast custom-delete-swal-title",
                cancelButton: "custom-swal-cancel-button",
                confirmButton: "custom-swal-confirm-button",
            },
        });

        if (result.isConfirmed) {
            await apiCall(); // call the function passed in
            return true; // confirmed and deleted
        }

        return false; // cancelled
    } catch (error) {
        console.error("Delete failed:", error);
        return false;
    }
};

export default DeleteAlert;