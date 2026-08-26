<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useDisplay } from "vuetify";
import { useAuthStore } from "@/stores/authStore";
import { usePartStore } from "@/stores/partStore";
import { useSettingStore } from "@/stores/settingStore";
import {
  listClassChats,
  listChatMessages,
  sendChatMessage,
  editChatMessage,
  deleteChatMessage,
  listClassChatMembers,
} from "@/services/api/classChat";
import { useChatUnreadStore } from "@/stores/chatUnreadStore";
import { useDialog } from "@/composable/useDialog";
import ChatMembersDialog from "@/views/global/chat/ChatMembersDialog.vue";

definePage({
  meta: {
    title: "Chat",
    layout: "default",
    subject: "Auth",
    requiresAuth: true,
    layoutWrapperClasses: "layout-content-height-fixed",
  },
});

const authStore = useAuthStore();
const partStore = usePartStore();
const settingStore = useSettingStore();
const chatUnreadStore = useChatUnreadStore();
const { showDialog } = useDialog();
const { system_part: systemPart } = storeToRefs(partStore);
const { branch_id: branchId } = storeToRefs(settingStore);
const { mdAndUp } = useDisplay();

const loadingChats = ref(false);
const loadingMessages = ref(false);
const sending = ref(false);
const search = ref("");
const chats = ref([]);
const activeChat = ref(null);
const messages = ref([]);
const draft = ref("");
const pendingFile = ref(null);
const messagesEl = ref(null);
const fileInput = ref(null);
/** Own message currently being edited (Telegram-style). */
const editingMessage = ref(null);
/** On small screens: false = chat list, true = conversation. */
const mobileShowChat = ref(false);
const membersDialogVisible = ref(false);
const memberCount = ref(null);
let pollTimer = null;
let listPollTimer = null;

const currentUserId = computed(() => Number(authStore.id || authStore.user?.id || 0));

const showChatList = computed(() => mdAndUp.value || !mobileShowChat.value);
const showConversation = computed(() => mdAndUp.value || mobileShowChat.value);

const filteredChats = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return chats.value;
  return chats.value.filter(
    (c) =>
      (c.name_en || "").toLowerCase().includes(q) ||
      (c.name_kh || "").toLowerCase().includes(q),
  );
});

const isEditing = computed(() => Boolean(editingMessage.value));

const canSend = computed(() => {
  if (sending.value) return false;
  if (isEditing.value) return Boolean(draft.value.trim());
  return Boolean(draft.value.trim() || pendingFile.value);
});

function isOwnMessage(msg) {
  return msg.sender_type === "user" && Number(msg.sender_id) === currentUserId.value;
}

function canEditMessage(msg) {
  return (
    isOwnMessage(msg) &&
    !msg.is_deleted &&
    (msg.message_type === "text" || Boolean(msg.content))
  );
}

function canDeleteMessage(msg) {
  return isOwnMessage(msg) && !msg.is_deleted;
}

function replaceMessage(updated) {
  if (!updated?.id) return;
  messages.value = messages.value.map((msg) =>
    Number(msg.id) === Number(updated.id) ? { ...msg, ...updated } : msg,
  );
}

function formatTime(value) {
  if (!value) return "";
  return new Date(value).toLocaleString();
}

function attachmentUrl(msg) {
  return msg.attachments?.[0]?.file_url || msg.content;
}

function clearChatUnread(chatId) {
  const chat = chats.value.find((c) => c.chat_id === chatId);
  if (chat) chat.unread_count = 0;
  chatUnreadStore.applyFromChatList(chats.value);
}

async function loadChats({ quiet = false } = {}) {
  if (!quiet) loadingChats.value = true;
  try {
    chats.value = await listClassChats();
    chatUnreadStore.applyFromChatList(chats.value);

    const stillActive = chats.value.find(
      (chat) => chat.chat_id === activeChat.value?.chat_id,
    );
    if (stillActive) {
      activeChat.value = stillActive;
      // Only fetch+mark-read when the conversation pane is actually open.
      if (!quiet && (mdAndUp.value || mobileShowChat.value) && activeChat.value) {
        await loadMessages();
      }
    } else if (!quiet) {
      // Do NOT auto-open the first chat — that immediately mark-reads it and
      // wipes unread badges before the user can see them.
      activeChat.value = null;
      messages.value = [];
      memberCount.value = null;
      membersDialogVisible.value = false;
      mobileShowChat.value = false;
      stopMessagePolling();
    }
  } finally {
    if (!quiet) loadingChats.value = false;
  }
}

async function loadMessages() {
  if (!activeChat.value) return;
  loadingMessages.value = messages.value.length === 0;
  try {
    messages.value = await listChatMessages(activeChat.value.chat_id, {
      limit: 100,
    });
    clearChatUnread(activeChat.value.chat_id);
    await scrollToBottom();
  } finally {
    loadingMessages.value = false;
  }
}

async function loadMemberCount() {
  if (!activeChat.value?.chat_id) {
    memberCount.value = null;
    return;
  }
  try {
    const data = await listClassChatMembers(activeChat.value.chat_id);
    memberCount.value = data?.member_count ?? 0;
  } catch {
    memberCount.value = null;
  }
}

function onMembersUpdated(payload) {
  if (payload && typeof payload.member_count === "number") {
    memberCount.value = payload.member_count;
  } else {
    void loadMemberCount();
  }
}

async function selectChat(chat) {
  activeChat.value = chat;
  messages.value = [];
  memberCount.value = null;
  mobileShowChat.value = true;
  await Promise.all([loadMessages(), loadMemberCount()]);
  startMessagePolling();
}

function openMembersDialog() {
  membersDialogVisible.value = true;
}

function backToChatList() {
  mobileShowChat.value = false;
  void loadChats({ quiet: true });
}

function startMessagePolling() {
  stopMessagePolling();
  pollTimer = setInterval(() => {
    if (activeChat.value) void loadMessagesQuiet();
  }, 5000);
}

function stopMessagePolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function startListPolling() {
  stopListPolling();
  listPollTimer = setInterval(() => {
    void loadChats({ quiet: true });
  }, 15000);
}

function stopListPolling() {
  if (listPollTimer) {
    clearInterval(listPollTimer);
    listPollTimer = null;
  }
}

function isNearBottom(threshold = 100) {
  const el = messagesEl.value;
  if (!el) return true;
  return el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
}

async function loadMessagesQuiet() {
  if (!activeChat.value || loadingMessages.value || sending.value) return;
  try {
    const stickToBottom = isNearBottom();
    messages.value = await listChatMessages(activeChat.value.chat_id, {
      limit: 100,
    });
    clearChatUnread(activeChat.value.chat_id);
    // Only follow new messages if the user is already at the bottom.
    // Scrolling up to read history must not jump back down on poll.
    if (stickToBottom) {
      await scrollToBottom();
    }
  } catch {
    // polling errors are non-fatal
  }
}

async function scrollToBottom() {
  await nextTick();
  if (messagesEl.value) {
    messagesEl.value.scrollTop = messagesEl.value.scrollHeight;
  }
}

function onFileSelected(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  pendingFile.value = file;
  event.target.value = "";
}

function clearPendingFile() {
  pendingFile.value = null;
}

function startEditMessage(msg) {
  if (!canEditMessage(msg)) return;
  editingMessage.value = msg;
  draft.value = msg.content || "";
  clearPendingFile();
}

function cancelEdit() {
  editingMessage.value = null;
  draft.value = "";
}

async function confirmDeleteMessage(msg) {
  if (!canDeleteMessage(msg)) return;
  const ok = await showDialog({
    title: "Delete message?",
    icon: "warning",
    isConfirm: true,
    isCancel: true,
  });
  if (!ok) return;

  sending.value = true;
  try {
    const updated = await deleteChatMessage(msg.id);
    replaceMessage(updated);
    if (editingMessage.value && Number(editingMessage.value.id) === Number(msg.id)) {
      cancelEdit();
    }
  } finally {
    sending.value = false;
  }
}

async function sendMessage() {
  if (!activeChat.value || !canSend.value) return;
  sending.value = true;
  try {
    if (editingMessage.value) {
      const updated = await editChatMessage({
        messageId: editingMessage.value.id,
        content: draft.value.trim(),
      });
      replaceMessage(updated);
      cancelEdit();
      return;
    }

    const sent = await sendChatMessage({
      chatId: activeChat.value.chat_id,
      content: draft.value.trim(),
      file: pendingFile.value,
    });
    draft.value = "";
    clearPendingFile();
    if (sent) {
      messages.value = [...messages.value.filter((msg) => msg.id !== sent.id), sent];
      await scrollToBottom();
    }
    await loadMessages();
  } finally {
    sending.value = false;
  }
}

onMounted(() => {
  void loadChats();
  startListPolling();
});
onBeforeUnmount(() => {
  stopMessagePolling();
  stopListPolling();
});

watch([systemPart, branchId], () => {
  void loadChats();
  void chatUnreadStore.refresh();
});
</script>

<template>
  <div class="class-chat-layout border rounded">
    <aside v-show="showChatList" class="chat-list-pane">
      <div class="chat-list-header pa-3">
        <h3 class="text-h6">{{ $t("Chat") }}</h3>
        <p class="text-caption text-medium-emphasis mb-0">
          {{ $t("Class group chats") }}
          <span v-if="systemPart"> · {{ systemPart }}</span>
        </p>
        <AppTextField
          v-model="search"
          class="mt-3"
          density="compact"
          hide-details
          :placeholder="$t('Search')"
        />
      </div>
      <VDivider />
      <div class="chat-list-body">
        <VProgressLinear v-if="loadingChats" indeterminate />
        <VList v-else nav density="comfortable">
          <VListItem
            v-for="chat in filteredChats"
            :key="chat.chat_id"
            :active="activeChat?.chat_id === chat.chat_id"
            @click="selectChat(chat)"
          >
            <template #append>
              <VChip
                v-if="Number(chat.unread_count) > 0"
                color="error"
                size="x-small"
                label
              >
                {{ chat.unread_count > 99 ? "99+" : chat.unread_count }}
              </VChip>
            </template>
            <VListItemTitle
              :class="{ 'font-weight-bold': Number(chat.unread_count) > 0 }"
            >
              {{ chat.name_en || chat.name_kh }}
            </VListItemTitle>
            <VListItemSubtitle v-if="chat.name_kh && chat.name_en">
              {{ chat.name_kh }}
            </VListItemSubtitle>
          </VListItem>
          <div
            v-if="!filteredChats.length"
            class="pa-4 text-center text-medium-emphasis text-body-2"
          >
            {{ $t("No class chats available") }}
          </div>
        </VList>
      </div>
    </aside>

    <section v-show="showConversation" class="chat-main d-flex flex-column">
      <template v-if="activeChat">
        <div class="chat-main-header pa-3 d-flex align-center gap-2">
          <VBtn
            v-if="!mdAndUp"
            icon
            variant="text"
            size="small"
            class="flex-shrink-0"
            :aria-label="$t('Back')"
            @click="backToChatList"
          >
            <VIcon icon="tabler-arrow-left" />
          </VBtn>
          <div
            class="chat-main-header-text chat-main-header-clickable"
            role="button"
            tabindex="0"
            @click="openMembersDialog"
            @keydown.enter.prevent="openMembersDialog"
          >
            <div class="text-h6 text-truncate">
              {{ activeChat.name_en || activeChat.name_kh }}
            </div>
            <div class="text-caption text-medium-emphasis">
              <template v-if="memberCount != null">
                {{ memberCount }} {{ $t("members") }}
              </template>
              <template v-else>
                {{ $t("Class group chat") }}
              </template>
            </div>
          </div>
          <VBtn
            icon
            variant="text"
            size="small"
            class="flex-shrink-0"
            :aria-label="$t('Members')"
            @click="openMembersDialog"
          >
            <VIcon icon="tabler-users" />
          </VBtn>
        </div>
        <VDivider />

        <div ref="messagesEl" class="chat-messages flex-grow-1 pa-3 pa-md-4">
          <VProgressLinear v-if="loadingMessages" indeterminate class="mb-2" />
          <div
            v-for="msg in messages"
            :key="msg.id"
            class="message-row mb-4"
            :class="{ 'message-row-own': isOwnMessage(msg) }"
          >
            <div class="message-card">
              <div class="message-meta text-caption text-medium-emphasis mb-1 d-flex align-center flex-wrap ga-1">
                <strong>{{ msg.sender_name || $t("Unknown") }}</strong>
                <span class="message-time">{{ formatTime(msg.created_at) }}</span>
                <span v-if="msg.is_edited && !msg.is_deleted" class="message-edited">
                  ({{ $t("edited") }})
                </span>
                <VMenu v-if="canEditMessage(msg) || canDeleteMessage(msg)">
                  <template #activator="{ props: menuProps }">
                    <VBtn
                      v-bind="menuProps"
                      icon
                      size="x-small"
                      variant="text"
                      class="message-actions-btn"
                      :aria-label="$t('Edit')"
                    >
                      <VIcon size="16" icon="tabler-dots-vertical" />
                    </VBtn>
                  </template>
                  <VList density="compact" nav>
                    <VListItem
                      v-if="canEditMessage(msg)"
                      :title="$t('Edit')"
                      prepend-icon="tabler-edit"
                      @click="startEditMessage(msg)"
                    />
                    <VListItem
                      v-if="canDeleteMessage(msg)"
                      :title="$t('Delete')"
                      prepend-icon="tabler-trash"
                      base-color="error"
                      @click="confirmDeleteMessage(msg)"
                    />
                  </VList>
                </VMenu>
              </div>

              <div
                v-if="msg.is_deleted"
                class="message-bubble message-bubble-deleted"
                :class="{ 'message-bubble-own': isOwnMessage(msg) }"
              >
                <em>{{ $t("This message was deleted") }}</em>
              </div>

              <div
                v-else-if="msg.message_type === 'text'"
                class="message-bubble"
                :class="{ 'message-bubble-own': isOwnMessage(msg) }"
              >
                {{ msg.content }}
              </div>

              <div
                v-else-if="msg.message_type === 'image'"
                class="message-media"
                :class="{ 'message-media-own': isOwnMessage(msg) }"
              >
                <img
                  :src="attachmentUrl(msg)"
                  :alt="msg.attachments?.[0]?.file_name || 'image'"
                  class="chat-image"
                  loading="lazy"
                />
                <div v-if="msg.content" class="message-caption mt-1">
                  {{ msg.content }}
                </div>
              </div>

              <div
                v-else-if="msg.message_type === 'video'"
                class="message-media"
                :class="{ 'message-media-own': isOwnMessage(msg) }"
              >
                <video
                  :src="attachmentUrl(msg)"
                  controls
                  class="chat-video"
                  preload="metadata"
                />
                <div v-if="msg.content" class="message-caption mt-1">
                  {{ msg.content }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <VDivider />
        <div class="chat-composer pa-3">
          <div
            v-if="isEditing"
            class="editing-banner mb-2 d-flex align-center justify-space-between gap-2"
          >
            <div class="text-caption text-medium-emphasis text-truncate">
              {{ $t("Editing message") }}:
              <strong>{{ editingMessage.content }}</strong>
            </div>
            <VBtn icon size="x-small" variant="text" @click="cancelEdit">
              <VIcon icon="tabler-x" />
            </VBtn>
          </div>
          <div v-if="pendingFile && !isEditing" class="pending-file mb-2 d-flex align-center gap-2">
            <VChip closable class="text-truncate" @click:close="clearPendingFile">
              {{ pendingFile.name }}
            </VChip>
          </div>
          <div class="chat-composer-row">
            <VBtn
              v-if="!isEditing"
              icon
              variant="text"
              class="flex-shrink-0"
              :disabled="sending"
              @click="fileInput?.click()"
            >
              <VIcon icon="tabler-paperclip" />
            </VBtn>
            <input
              ref="fileInput"
              type="file"
              accept="image/*,video/*"
              class="d-none"
              @change="onFileSelected"
            />
            <AppTextField
              v-model="draft"
              class="chat-composer-input"
              density="comfortable"
              hide-details
              :placeholder="isEditing ? $t('Editing message') : $t('Type a message')"
              @keydown.enter.prevent="sendMessage"
              @keydown.esc="cancelEdit"
            />
            <VBtn
              color="primary"
              class="flex-shrink-0"
              :loading="sending"
              :disabled="!canSend"
              @click="sendMessage"
            >
              {{ isEditing ? $t("Edit") : $t("Send") }}
            </VBtn>
          </div>
        </div>
      </template>

      <div
        v-else
        class="flex-grow-1 d-flex align-center justify-center text-medium-emphasis pa-4 text-center"
      >
        {{ $t("Select a class chat to start") }}
      </div>
    </section>

    <ChatMembersDialog
      v-if="activeChat"
      v-model="membersDialogVisible"
      :chat-id="activeChat.chat_id"
      :class-id="activeChat.class_id"
      :class-name="activeChat.name_en || activeChat.name_kh"
      @updated="onMembersUpdated"
    />
  </div>
</template>

<style scoped>
.class-chat-layout {
  display: flex;
  height: calc(100vh - 8rem);
  min-height: 28rem;
  overflow: hidden;
  background: rgb(var(--v-theme-surface));
}

.chat-list-pane {
  display: flex;
  flex-direction: column;
  flex: 0 0 300px;
  width: 300px;
  max-width: 100%;
  border-inline-end: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  min-width: 0;
}

.chat-main {
  flex: 1 1 auto;
  min-width: 0;
  height: 100%;
  overflow: hidden;
}

.chat-list-header,
.chat-main-header,
.chat-composer {
  flex-shrink: 0;
  background: rgb(var(--v-theme-surface));
}

.chat-main-header-text {
  min-width: 0;
  flex: 1 1 auto;
}

.chat-main-header-clickable {
  cursor: pointer;
  border-radius: 8px;
  padding-block: 2px;
}

.chat-main-header-clickable:hover .text-h6 {
  text-decoration: underline;
  text-underline-offset: 2px;
}

.chat-list-body {
  flex: 1 1 auto;
  overflow-y: auto;
  min-height: 0;
}

.chat-messages {
  overflow-y: auto;
  min-height: 0;
  background: #f5f7fa;
}

.chat-composer-row {
  display: flex;
  align-items: flex-end;
  gap: 0.5rem;
  min-width: 0;
}

.chat-composer-input {
  flex: 1 1 auto;
  min-width: 0;
}

.message-row {
  display: flex;
  justify-content: flex-start;
  min-width: 0;
}

.message-row-own {
  justify-content: flex-end;
}

.message-card {
  max-width: min(85%, 520px);
  min-width: 0;
}

.message-row-own .message-card {
  text-align: right;
}

.message-meta {
  overflow-wrap: anywhere;
  gap: 0.35rem;
}

.message-time {
  white-space: nowrap;
  font-size: 10px;
}

.message-edited {
  white-space: nowrap;
  font-style: italic;
  opacity: 0.85;
  font-size: 10px;
}

.message-actions-btn {
  opacity: 0.55;
}

.message-actions-btn:hover {
  opacity: 1;
}

.message-bubble,
.message-media {
  display: inline-block;
  max-width: 100%;
  padding: 2px 10px;
  border-radius: 10px;
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.08);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: break-word;
  text-align: start;
}

.message-bubble-own,
.message-media-own {
  background: #1976d2;
  color: white;
  border-color: #1976d2;
}

.message-bubble-deleted {
  opacity: 0.75;
  font-style: italic;
}

.editing-banner {
  padding: 0.4rem 0.6rem;
  border-radius: 8px;
  background: rgba(var(--v-theme-primary), 0.08);
  border-inline-start: 3px solid rgb(var(--v-theme-primary));
}

.chat-image {
  display: block;
  width: 100%;
  max-width: min(100%, 420px);
  max-height: 320px;
  border-radius: 12px;
  object-fit: contain;
  background: #000;
}

.chat-video {
  display: block;
  width: 100%;
  max-width: min(100%, 480px);
  max-height: 360px;
  border-radius: 12px;
  background: #000;
}

.message-caption {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

@media (max-width: 959px) {
  .class-chat-layout {
    height: calc(100vh - 6.5rem);
    min-height: 0;
  }

  .chat-list-pane,
  .chat-main {
    flex: 1 1 100%;
    width: 100%;
    border-inline-end: none;
  }
}
</style>
