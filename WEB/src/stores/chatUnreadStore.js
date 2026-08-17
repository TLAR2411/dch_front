import { defineStore } from "pinia";
import { getClassChatUnreadSummary } from "@/services/api/classChat";

export const useChatUnreadStore = defineStore("chatUnread", {
  state: () => ({
    unreadChats: 0,
    unreadMessages: 0,
    loading: false,
    lastFetchedAt: null,
  }),

  actions: {
    applySummary({ unread_chats = 0, unread_messages = 0 } = {}) {
      this.unreadChats = Number(unread_chats) || 0;
      this.unreadMessages = Number(unread_messages) || 0;
      this.lastFetchedAt = Date.now();
    },

    applyFromChatList(chats = []) {
      let unreadChats = 0;
      let unreadMessages = 0;
      for (const chat of chats) {
        const n = Number(chat.unread_count ?? 0);
        if (n > 0) {
          unreadChats += 1;
          unreadMessages += n;
        }
      }
      this.applySummary({
        unread_chats: unreadChats,
        unread_messages: unreadMessages,
      });
    },

    clearChatLocally(chatId, chatsRef) {
      if (Array.isArray(chatsRef)) {
        const chat = chatsRef.find((c) => c.chat_id === chatId);
        if (chat) chat.unread_count = 0;
        this.applyFromChatList(chatsRef);
        return;
      }
      void this.refresh();
    },

    async refresh() {
      if (this.loading) return;
      this.loading = true;
      try {
        const summary = await getClassChatUnreadSummary();
        this.applySummary(summary);
      } catch {
        // Non-fatal: badge just stays at last known value.
      } finally {
        this.loading = false;
      }
    },
  },
});
