import axios from "axios";
import io from "socket.io-client";
import { APP_URL } from "./config.js";

const $ = (selector) => document.querySelector(selector);
const fallbackAvatar = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRiRo5RsazUIy3LPn-DG57NPTKgVyRcUqqJODFRmkEdbg&s=10";
let myID = "";
let people = [];
let searchTimer;
let socket;

function safeText(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getSocketUrl() {
   return APP_URL.replace(/\/api\/auth\/?$/, "");
}

function getTime(value) {
  if (!value) return "";
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function openConversation(conversation, user) {
  const params = new URLSearchParams({
    id: conversation.conversationId,
    userId: user.id,
    name: user.fullname || "Conversation",
    username: user.username || "",
    avatar: user.avatar || fallbackAvatar
  });

  window.location.href = "./conversation.html?" + params.toString();
}

function showConversations(conversations) {
  if (!conversations.length) {
    $("#conversation-list").innerHTML = '<div class="conversation-state">No messages yet. Start a conversation.</div>';
    return;
  }

  $("#conversation-list").innerHTML = conversations.map((conversation) => {
    const user = conversation.user;
    const lastMessage = conversation.lastMessage;
    const messageText = lastMessage
      ? (String(lastMessage.senderId) === myID ? "You: " : "") + (lastMessage.text || "")
      : "Start a conversation";
    const status = String(user.status || "").toLowerCase() === "online" ? "online" : "";

    return '<button class="conversation-item" type="button" data-conversation-id="' + safeText(conversation.conversationId) + '"' +
      ' data-user-id="' + safeText(user.id) + '" data-name="' + safeText(user.fullname || "Conversation") + '"' +
      ' data-username="' + safeText(user.username || "") + '" data-avatar="' + safeText(user.avatar || fallbackAvatar) + '">' +
      '<span class="conversation-list-avatar-wrap">' +
        '<img class="conversation-list-avatar" src="' + safeText(user.avatar || fallbackAvatar) + '" alt="" />' +
        '<span class="conversation-list-dot ' + status + '"></span>' +
      '</span>' +
      '<span class="conversation-item-content">' +
        '<span class="conversation-item-top"><span class="conversation-name">' + safeText(user.fullname || "New user") + '</span><time>' + getTime(lastMessage?.createdAt) + '</time></span>' +
        '<span class="conversation-item-bottom"><span class="conversation-preview">' + safeText(messageText) + '</span></span>' +
      '</span>' +
    '</button>';
  }).join("");
}

async function loadConversations() {
  try {
    const res = await axios.get(APP_URL + "/conversations", { withCredentials: true });
    showConversations(res.data.conversations || []);
  } catch {
    $("#conversation-list").innerHTML = '<div class="conversation-state">Could not load messages. Please try again.</div>';
  }
}

function showPeople(list) {
  const availablePeople = list.filter((user) => String(user._id) !== myID);

  if (!availablePeople.length) {
    $("#people-list").innerHTML = '<p class="people-state">No people found.</p>';
    return;
  }

  $("#people-list").innerHTML = availablePeople.map((user) => {
    return '<button class="people-item" type="button" data-user-id="' + safeText(user._id) + '">' +
      '<img src="' + safeText(user.avatar || fallbackAvatar) + '" alt="" />' +
      '<span>' + safeText(user.fullname || "New user") + '</span>' +
    '</button>';
  }).join("");
}

async function loadPeople(value = "") {
  $("#people-list").innerHTML = '<p class="people-state">Loading people...</p>';

  try {
    const res = await axios.post(
      APP_URL + "/getUsers",
      { search: value.trim().replace(/^@/, ""), limit: 50 },
      { withCredentials: true }
    );
    people = res.data.users || [];
    showPeople(people);
  } catch {
    $("#people-list").innerHTML = '<p class="people-state">Could not load people.</p>';
  }
}

async function startConversation(userID) {
  try {
    const res = await axios.post(
      APP_URL + "/conversations/start",
      { userID },
      { withCredentials: true }
    );
    openConversation(res.data, res.data.user);
  } catch {
    $("#people-list").innerHTML = '<p class="people-state">Could not start this conversation.</p>';
  }
}

function showPeopleModal(isOpen) {
  $("#people-modal").hidden = !isOpen;
  document.body.classList.toggle("people-modal-open", isOpen);

  if (isOpen) {
    $("#people-search").value = "";
    loadPeople();
    $("#people-search").focus();
  }
}

async function initialize() {
  try {
    const cachedData = JSON.parse(localStorage.getItem("myData") || "null") || {};
    myID = String(cachedData.id || "");

    if (!myID) {
      const res = await axios.get(APP_URL + "/getMyData", { withCredentials: true });
      myID = String(res.data.id);
      localStorage.setItem("myData", JSON.stringify(res.data));
    }

    await loadConversations();
    socket = io(getSocketUrl(), { withCredentials: true });
    socket.on("newMessage", loadConversations);
  } catch {
    $("#conversation-list").innerHTML = '<div class="conversation-state">Please sign in to see your messages.</div>';
  }
}

$("#conversation-list").addEventListener("click", (event) => {
  const item = event.target.closest(".conversation-item");
  if (!item) return;

  openConversation(
    { conversationId: item.dataset.conversationId },
    {
      id: item.dataset.userId,
      fullname: item.dataset.name,
      username: item.dataset.username,
      avatar: item.dataset.avatar
    }
  );
});

$("#new-message").addEventListener("click", () => showPeopleModal(true));

document.querySelectorAll("[data-close-people]").forEach((button) => {
  button.addEventListener("click", () => showPeopleModal(false));
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !$("#people-modal").hidden) showPeopleModal(false);
});

$("#people-search").addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => loadPeople($("#people-search").value), 250);
});

$("#people-list").addEventListener("click", (event) => {
  const item = event.target.closest("[data-user-id]");
  if (item) startConversation(item.dataset.userId);
});

initialize();
