import { api } from "@/utils/api";

export const listClassChats = () =>
  api.post("/api/class-chat-list", {}).then((r) => r.data.data ?? []);

export const listChatMessages = (chatId, options = {}) =>
  api
    .post("/api/class-chat-messages", {
      chat_id: chatId,
      ...options,
    })
    .then((r) => r.data.data ?? []);

export const markClassChatRead = (chatId) =>
  api
    .post("/api/class-chat-mark-read", { chat_id: chatId })
    .then((r) => r.data.data);

export const getClassChatUnreadSummary = () =>
  api
    .post("/api/class-chat-unread-summary", {})
    .then((r) => r.data.data ?? { unread_chats: 0, unread_messages: 0 });

export const sendChatMessage = ({ chatId, content, file, replyToId }) => {
  const form = new FormData();
  form.append("chat_id", String(chatId));
  if (content) form.append("content", content);
  if (replyToId) form.append("reply_to_id", String(replyToId));
  if (file) form.append("file", file);

  // Clear Content-Type so the adapter sets multipart + boundary.
  // The axios instance defaults to application/json, which turns File into {}
  // and leaves multer with no upload.
  return api
    .post("/api/class-chat-send", form, {
      headers: { "Content-Type": undefined },
      // Large phone videos upload then compress server-side — allow a long wait.
      timeout: 15 * 60 * 1000,
    })
    .then((r) => r.data.data);
};

export const editChatMessage = ({ messageId, content }) =>
  api
    .post("/api/class-chat-edit", {
      message_id: messageId,
      content,
    })
    .then((r) => r.data.data);

export const deleteChatMessage = (messageId) =>
  api
    .post("/api/class-chat-delete", { message_id: messageId })
    .then((r) => r.data.data);

export const listClassChatMembers = (chatId) =>
  api
    .post("/api/class-chat-members", { chat_id: chatId })
    .then((r) => r.data.data ?? null);
