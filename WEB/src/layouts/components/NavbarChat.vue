<script setup>
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";
import hasPermission from "@/utils/hasPermission.js";
import { useChatUnreadStore } from "@/stores/chatUnreadStore";

const router = useRouter();
const chatUnreadStore = useChatUnreadStore();
const { unreadChats } = storeToRefs(chatUnreadStore);

const canViewChat = computed(() => hasPermission("class-chat:view-data"));
const badgeLabel = computed(() => {
  const n = Number(unreadChats.value) || 0;
  if (n <= 0) return null;
  return n > 99 ? "99+" : String(n);
});

function openChat() {
  router.push({ name: "global-chat" });
}
</script>

<template>
  <IconBtn
    v-if="canViewChat"
    class="navbar-chat-btn"
    :aria-label="$t('Chat')"
    @click="openChat"
  >
    <VBadge
      v-if="badgeLabel"
      :content="badgeLabel"
      class="pa-0"
      color="error"
      floating
      offset-x="2"
      offset-y="6"
    >
      <VIcon size="24" icon="tabler-messages" />
    </VBadge>
    <VIcon v-else size="24" icon="tabler-messages" />
  </IconBtn>
</template>
