import Swal from "sweetalert2";

const successAlert = Swal.mixin({
    toast: true,
    position: "top-end",
    customClass: {
        popup: "colored-toast, custom-swal-title",
    },
    showConfirmButton: false,
    timer: 3500,
    timerProgressBar: true,
});

export default successAlert;