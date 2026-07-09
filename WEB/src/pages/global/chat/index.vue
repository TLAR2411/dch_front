<template>
  <div class="chat-wrapper border">
    <!-- Header -->
    <div class="chat-header">
      <div class="avatar">
        <span>🏫</span>
      </div>
      <div class="header-info">
        <h2>School Assistant</h2>
        <span class="status">● Online</span>
      </div>
      <div class="role-tabs">
        <button
          :class="['role-btn', { active: role === 'parent' }]"
          @click="setRole('parent')"
        >
          Parent
        </button>
        <button
          :class="['role-btn', { active: role === 'teacher' }]"
          @click="setRole('teacher')"
        >
          Teacher
        </button>
      </div>
    </div>

    <!-- Messages -->
    <div class="chat-messages" ref="messagesEl">
      <div
        v-for="(msg, i) in messages"
        :key="i"
        :class="['message-row', msg.sender === 'user' ? 'user-row' : 'bot-row']"
      >
        <div v-if="msg.sender === 'bot'" class="bot-icon">🤖</div>
        <div
          :class="[
            'bubble',
            msg.sender === 'user' ? 'user-bubble' : 'bot-bubble',
          ]"
        >
          <span v-html="msg.text"></span>
          <span class="time">{{ msg.time }}</span>
        </div>
      </div>

      <!-- Typing indicator -->
      <div v-if="isTyping" class="message-row bot-row">
        <div class="bot-icon">🤖</div>
        <div class="bubble bot-bubble typing">
          <span class="dot"></span>
          <span class="dot"></span>
          <span class="dot"></span>
        </div>
      </div>
    </div>

    <!-- Quick suggestions -->
    <div class="quick-btns">
      <button
        v-for="q in quickQuestions"
        :key="q"
        class="quick-btn"
        @click="sendQuick(q)"
      >
        {{ q }}
      </button>
    </div>

    <!-- Input area -->
    <div class="chat-input">
      <input
        v-model="inputText"
        type="text"
        :placeholder="'Ask something as a ' + role + '...'"
        @keydown.enter="sendMessage"
      />
      <button
        class="send-btn"
        @click="sendMessage"
        :disabled="!inputText.trim()"
      >
        ➤
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick } from "vue";

// --- State ---
const role = ref("parent");
const inputText = ref("");
const isTyping = ref(false);
const messagesEl = ref(null);

const messages = ref([
  {
    sender: "bot",
    text: "Hello! I am your school assistant. How can I help you today?",
    time: now(),
  },
]);

// --- Quick questions per role ---
const parentQuestions = [
  "What time does school end?",
  "How is my child doing?",
  "When is the next exam?",
  "Is the fee paid?",
];
const teacherQuestions = [
  "Who is absent today?",
  "Show Grade 3 summary",
  "When is parent meeting?",
  "List low performers",
];
const quickQuestions = computed(() =>
  role.value === "parent" ? parentQuestions : teacherQuestions,
);

// --- Preset answers (replace with real API call in production) ---
const parentAnswers = {
  "what time does school end": "School ends at <b>3:00 PM</b> today. 🕒",
  "how is my child doing":
    "Your child <b>Sophea</b>:<br>• Math: 85/100 ✅<br>• Khmer: 78/100 ✅<br>• Science: 90/100 ⭐",
  "when is the next exam":
    "Next exam: <b>June 15, 2026</b> — Math & Khmer for Grade 1–3.",
  "is the fee paid": "June fee of <b>$45 is unpaid</b>. Due: June 10, 2026. 💳",
};
const teacherAnswers = {
  "who is absent today":
    "Today's absences in Grade 2A:<br>• Dara Sok<br>• Maly Chan<br>• Piseth Ros",
  "show grade 3 summary":
    "Grade 3 — June 2026:<br>• Avg score: <b>76.4%</b><br>• Top: Sokha Pov (94%)<br>• Need support: 4 students",
  "when is parent meeting":
    "Parent-Teacher Meeting: <b>June 20, 2026</b>, 8 AM–12 PM. 12 confirmed.",
  "list low performers":
    "Below 60% this term:<br>• Vuthy Keo — 52%<br>• Sreymom Tep — 58%<br>• Rithy Hang — 49%",
};

// --- Methods ---
function now() {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function setRole(newRole) {
  role.value = newRole;
  messages.value.push({
    sender: "bot",
    text: `Switched to <b>${newRole === "parent" ? "Parent" : "Teacher"}</b> mode. What would you like to know?`,
    time: now(),
  });
  scrollDown();
}

function sendQuick(q) {
  inputText.value = q;
  sendMessage();
}

async function sendMessage() {
  const text = inputText.value.trim();
  if (!text) return;

  // Add user message
  messages.value.push({ sender: "user", text, time: now() });
  inputText.value = "";
  scrollDown();

  // Show typing
  isTyping.value = true;
  await new Promise((r) => setTimeout(r, 800));
  isTyping.value = false;

  // Find answer
  const key = text.toLowerCase();
  const answers = role.value === "parent" ? parentAnswers : teacherAnswers;
  const matched = Object.keys(answers).find(
    (k) => key.includes(k.split(" ")[0]) && key.includes(k.split(" ").at(-1)),
  );

  const reply = matched
    ? answers[matched]
    : "I'm not sure about that. Please contact the school office directly. 🙏";

  messages.value.push({ sender: "bot", text: reply, time: now() });
  scrollDown();
}

async function scrollDown() {
  await nextTick();
  if (messagesEl.value) {
    messagesEl.value.scrollTop = messagesEl.value.scrollHeight;
  }
}
</script>

<style scoped>
/* Layout */
.chat-wrapper {
  height: 100%;
  max-width: 50%;

  font-family: "Segoe UI", sans-serif;
  background: #f5f7fa;
}

@media (max-width: 480px) {
  .chat-wrapper {
    max-width: 100%;
    height: 100dvh; /* dvh = dynamic viewport height, fixes mobile browser bar */
  }
}

/* Header */
.chat-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  background: #ffffff;
  border-bottom: 1px solid #e8eaed;
}
.avatar {
  width: 40px;
  height: 40px;
  background: #e8f0fe;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}
.header-info h2 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #1a1a2e;
}
.status {
  font-size: 11px;
  color: #34a853;
}
.role-tabs {
  margin-left: auto;
  display: flex;
  gap: 6px;
}
.role-btn {
  padding: 5px 12px;
  border-radius: 20px;
  border: 1px solid #ddd;
  background: transparent;
  color: #666;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}
.role-btn.active {
  background: #1a73e8;
  border-color: #1a73e8;
  color: #fff;
}

/* Messages area */
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.message-row {
  display: flex;
  align-items: flex-end;
  gap: 8px;
}
.user-row {
  flex-direction: row-reverse;
}
.bot-icon {
  width: 30px;
  height: 30px;
  background: #e8f0fe;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  flex-shrink: 0;
}

/* Bubbles */
.bubble {
  max-width: 72%;
  padding: 10px 14px;
  border-radius: 18px;
  font-size: 14px;
  line-height: 1.5;
  position: relative;
}
.bot-bubble {
  background: #ffffff;
  color: #1a1a2e;
  border-bottom-left-radius: 4px;
  border: 1px solid #e8eaed;
}
.user-bubble {
  background: #1a73e8;
  color: #ffffff;
  border-bottom-right-radius: 4px;
}
.time {
  display: block;
  font-size: 10px;
  margin-top: 4px;
  opacity: 0.55;
  text-align: right;
}

/* Typing dots */
.typing {
  display: flex;
  gap: 4px;
  align-items: center;
  padding: 12px 16px;
}
.dot {
  width: 7px;
  height: 7px;
  background: #aaa;
  border-radius: 50%;
  animation: bounce 1.2s infinite;
}
.dot:nth-child(2) {
  animation-delay: 0.2s;
}
.dot:nth-child(3) {
  animation-delay: 0.4s;
}
@keyframes bounce {
  0%,
  80%,
  100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-6px);
  }
}

/* Quick buttons */
.quick-btns {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 8px 16px;
  background: #fff;
  border-top: 1px solid #e8eaed;
}
.quick-btn {
  padding: 5px 12px;
  border-radius: 20px;
  border: 1px solid #ddd;
  background: #f8f9fa;
  color: #444;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.15s;
  white-space: nowrap;
}
.quick-btn:hover {
  background: #e8f0fe;
  border-color: #1a73e8;
  color: #1a73e8;
}

/* Input */
.chat-input {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  background: #ffffff;
  border-top: 1px solid #e8eaed;
}
.chat-input input {
  flex: 1;
  padding: 10px 14px;
  border-radius: 24px;
  border: 1px solid #ddd;
  outline: none;
  font-size: 14px;
  background: #f8f9fa;
  transition: border 0.2s;
}
.chat-input input:focus {
  border-color: #1a73e8;
  background: #fff;
}
.send-btn {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  border: none;
  background: #1a73e8;
  color: #fff;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition:
    background 0.2s,
    transform 0.1s;
}
.send-btn:hover {
  background: #1557b0;
}
.send-btn:active {
  transform: scale(0.93);
}
.send-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}
</style>
