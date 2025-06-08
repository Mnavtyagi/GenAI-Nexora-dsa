document.addEventListener("DOMContentLoaded", () => {
  // --- DOM Elements ---
  const chatLog = document.getElementById("chat-log");
  const chatInput = document.getElementById("chat-input");
  const sendBtn = document.getElementById("send-btn");
  const newChatBtn = document.getElementById("new-chat-btn");
  const chatHistoryList = document.getElementById("chat-history");
  const welcomeScreen = document.getElementById("welcome-screen");

  // Theme & Responsive Elements
  const themeCheckbox = document.getElementById("theme-checkbox");
  const sidebarToggle = document.getElementById("sidebar-toggle");
  const mobileOverlay = document.getElementById("mobile-overlay");
  const appContainer = document.getElementById("app-container");

  // --- State Management ---
  let chats = [];
  let currentChatId = null;

  // --- INITIALIZATION ---
  initializeTheme();
  loadChatsFromLocalStorage();
  renderChatHistory();
  chats.length > 0 ? switchChat(chats[0].id) : startNewChat();

  // --- EVENT LISTENERS ---
  sendBtn.addEventListener("click", handleSendMessage);
  chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  });
  newChatBtn.addEventListener("click", () => {
    startNewChat();
    closeSidebar();
  });
  themeCheckbox.addEventListener("change", toggleTheme);
  sidebarToggle.addEventListener("click", () =>
    appContainer.classList.toggle("sidebar-open")
  );
  mobileOverlay.addEventListener("click", closeSidebar);

  // --- THEME MANAGEMENT ---
  function initializeTheme() {
    const savedTheme = localStorage.getItem("theme") || "dark";
    if (savedTheme === "light") {
      document.body.classList.add("light-mode");
      themeCheckbox.checked = true;
    }
  }
  function toggleTheme() {
    document.body.classList.toggle("light-mode");
    const currentTheme = document.body.classList.contains("light-mode")
      ? "light"
      : "dark";
    localStorage.setItem("theme", currentTheme);
  }

  // --- RESPONSIVE SIDEBAR ---
  function closeSidebar() {
    appContainer.classList.remove("sidebar-open");
  }

  // --- CORE CHAT LOGIC ---
  async function handleSendMessage() {
    const prompt = chatInput.value.trim();
    if (!prompt) return;
    if (welcomeScreen.style.display !== "none")
      welcomeScreen.style.display = "none";

    addMessageToLog("user", prompt);

    const loadingMessage = addMessageToLog("ai", "thinking");

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      if (!response.ok) throw new Error(`Server error: ${response.status}`);
      const data = await response.json();

      updateMessage(loadingMessage, data.response);
    } catch (error) {
      console.error("Error fetching AI response:", error);
      updateMessage(
        loadingMessage,
        "A critical error occurred in my processing core. Please try again."
      );
    }

    chatInput.value = "";
  }

  // --- UI & DOM ---
  function addMessageToLog(sender, text) {
    const messageElement = document.createElement("div");
    messageElement.classList.add("chat-message", sender);

    const avatar = `<div class="avatar">${sender === "ai" ? "N" : "U"}</div>`;
    const contentDiv = document.createElement("div");
    contentDiv.classList.add("message-content");

    if (text === "thinking") {
      contentDiv.classList.add("thinking");
    } else {
      contentDiv.innerHTML = marked.parse(text);
    }

    messageElement.innerHTML = avatar;
    messageElement.appendChild(contentDiv);
    chatLog.appendChild(messageElement);
    scrollToBottom();

    if (sender === "user") {
      const currentChat = chats.find((c) => c.id === currentChatId);
      if (currentChat) {
        currentChat.messages.push({ sender, text });
        saveCurrentChat();
      }
    }
    return messageElement;
  }

  function updateMessage(messageElement, newText) {
    const contentDiv = messageElement.querySelector(".message-content");
    contentDiv.classList.remove("thinking");
    contentDiv.innerHTML = marked.parse(newText);
    addCopyButtons(contentDiv); // Add copy buttons to code blocks

    const currentChat = chats.find((c) => c.id === currentChatId);
    if (currentChat) {
      currentChat.messages.push({ sender: "ai", text: newText });
      saveCurrentChat();
    }
  }

  function addCopyButtons(container) {
    /* Unchanged from previous versions */
  }
  function scrollToBottom() {
    chatLog.scrollTop = chatLog.scrollHeight;
  }

  // --- CHAT HISTORY MANAGEMENT ---
  function startNewChat() {
    currentChatId = `chat-${Date.now()}`;
    chats.unshift({ id: currentChatId, title: "New Chat", messages: [] });
    chatLog.innerHTML = "";
    welcomeScreen.style.display = "flex";
    saveChatsToLocalStorage();
    renderChatHistory();
    setActiveChatInUI(currentChatId);
  }

  function switchChat(id) {
    currentChatId = id;
    const chat = chats.find((c) => c.id === id);
    if (!chat) return;

    welcomeScreen.style.display = "none";
    chatLog.innerHTML = "";

    chat.messages.forEach((msg) => addMessageToLog(msg.sender, msg.text));

    scrollToBottom();
    setActiveChatInUI(id);
    closeSidebar();
  }

  function deleteChat(id, element) {
    chats = chats.filter((c) => c.id !== id);
    saveChatsToLocalStorage();
    element.remove();

    if (currentChatId === id) {
      if (chats.length > 0) {
        switchChat(chats[0].id);
      } else {
        startNewChat();
      }
    }
  }

  function saveCurrentChat() {
    const chat = chats.find((c) => c.id === currentChatId);
    if (chat && chat.messages.length > 0 && chat.title === "New Chat") {
      const firstUserMessage = chat.messages.find((m) => m.sender === "user");
      if (firstUserMessage) {
        chat.title =
          firstUserMessage.text.substring(0, 25) +
          (firstUserMessage.text.length > 25 ? "..." : "");
      }
    }
    saveChatsToLocalStorage();
    renderChatHistory(); // Update titles
  }

  function saveChatsToLocalStorage() {
    localStorage.setItem("nexora_chats", JSON.stringify(chats));
  }
  function loadChatsFromLocalStorage() {
    const savedChats = localStorage.getItem("nexora_chats");
    if (savedChats) chats = JSON.parse(savedChats);
  }

  function renderChatHistory() {
    chatHistoryList.innerHTML = "";
    chats.forEach((chat) => {
      const li = document.createElement("li");
      li.dataset.id = chat.id;
      li.title = chat.title;
      li.innerHTML = `<span>${chat.title}</span><button class="chat-delete-btn" title="Delete"><i class="fa-solid fa-trash-can"></i></button>`;
      li.addEventListener("click", () => switchChat(chat.id));
      li.querySelector(".chat-delete-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        deleteChat(chat.id, li);
      });
      chatHistoryList.appendChild(li);
    });
    setActiveChatInUI(currentChatId);
  }

  function setActiveChatInUI(id) {
    document
      .querySelectorAll(".chat-history li")
      .forEach((li) => li.classList.toggle("active", li.dataset.id === id));
  }
});
