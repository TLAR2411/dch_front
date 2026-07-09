// composables/useDialog.js
import { ref } from 'vue';

// Shared state (singleton)
const dialogRef = ref(null);

export function useDialog() {
    // Initialize the dialog reference (call this once in App.vue)
    const initializeDialog = (componentRef) => {
        dialogRef.value = componentRef;
    };

    // Open the dialog from anywhere
    const showDialog = async (items) => {

        if (!dialogRef.value) {
            throw new Error('Dialog component not initialized!');
        }
        return await dialogRef.value.openDialog(items.title, items.icon, items.isCancel, items.isConfirm, items.confirmColor, items.timer, items.cancelText, items.confirmText);
    };

    return { initializeDialog, showDialog };
}