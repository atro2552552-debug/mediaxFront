import axios from "axios";
import { APP_URL } from "./config.js";
import io from "socket.io-client"
 


const $ = (selector) => document.querySelector(selector);
const fallbackAvatar = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRiRo5RsazUIy3LPn-DG57NPTKgVyRcUqqJODFRmkEdbg&s=10";
const params = new URLSearchParams(window.location.search);
const conversationId = params.get("id");
const otherUserId = params.get("userId");
const myData = JSON.parse(localStorage.getItem("myData") || "null") || {};
let myID = String(myData.id || "");
let messages = [];
let replyingTo = null;
let socket;
let swipeStart = null;

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

function messageTime(value) {
  if (!value) return "";
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function messageHTML(message) {
  const mine = String(message.senderId) === myID;
  const reply = message.replyTo
    ? '<div class="message-reply"><strong>' + safeText(message.replyTo.senderName || "Message") + '</strong><span>' + safeText(message.replyTo.text || "") + '</span></div>'
    : "";

  return '<article class="message-row ' + (mine ? "mine" : "theirs") + '" data-message-id="' + safeText(message.messageId) + '">' +
    '<div class="message-bubble">' +
      reply +
      '<p class="message-text">' + safeText(message.text || "") + '</p>' +
      '<div class="message-meta"><time>' + messageTime(message.createdAt) + '</time></div>' +
    '</div>' +
  '</article>';
}

function showMessages() {
  if (!messages.length) {
    $("#conversation-messages").innerHTML = '<div class="conversation-state">Send a message to start the conversation.</div>';
    return;
  }

  $("#conversation-messages").innerHTML = messages.map(messageHTML).join("");
  $("#conversation-messages").scrollTop = $("#conversation-messages").scrollHeight;
}

function addMessage(message) {
  if (messages.some((item) => item.messageId === message.messageId)) return;
  messages.push(message);
  messages.sort((first, second) => new Date(first.createdAt) - new Date(second.createdAt));
  showMessages();
}

function showReply(message) {
  replyingTo = {
    messageId: message.messageId,
    text: message.text,
    senderName: String(message.senderId) === myID ? "You" : params.get("name") || "User"
  };

  $("#reply-name").textContent = replyingTo.senderName;
  $("#reply-text").textContent = replyingTo.text;
  $("#reply-preview").hidden = false;
  $("#message-input").focus();
}

function initializeHeader() {
  $("#conversation-name").textContent = params.get("name") || "Conversation";
  $("#conversation-status").textContent = params.get("username")
    ? "@" + params.get("username").replace(/^@/, "")
    : "Messages";
  $("#conversation-avatar").src = params.get("avatar") || fallbackAvatar;
}

async function loadMessages() {
  try {
    const res = await axios.get(
      APP_URL + "/conversations/" + encodeURIComponent(conversationId) + "/messages",
      { withCredentials: true }
    );
    res.data.messages.forEach(addMessage);
    showMessages();
  } catch {
    $("#conversation-messages").innerHTML = '<div class="conversation-state">Could not load this conversation.</div>';
  }
}

async function initialize() {
  initializeHeader();

  if (!myID) {
    try {
      const res = await axios.get(APP_URL + "/getMyData", { withCredentials: true });
      myID = String(res.data.id);
      localStorage.setItem("myData", JSON.stringify(res.data));
    } catch {
      $("#conversation-messages").innerHTML = '<div class="conversation-state">Please sign in to use messages.</div>';
      return;
    }
  }

  if (!conversationId || !otherUserId) {
    $("#conversation-messages").innerHTML = '<div class="conversation-state">Choose a conversation first.</div>';
    return;
  }

  socket = io(getSocketUrl(), { withCredentials: true });

  socket.on("connect", () => {
    $("#conversation-error").textContent = "";
  });

  socket.on("connect_error", () => {
    $("#conversation-error").textContent = "Connecting to messages...";
  });

  socket.on("newMessage", (message) => {
    if (message.conversationId !== conversationId) return;
    addMessage(message);
    $("#conversation-error").textContent = "";
  });

  await loadMessages();
}

$("#conversation-messages").addEventListener("pointerdown", (event) => {
  const row = event.target.closest(".message-row");
  if (!row || (event.pointerType === "mouse" && event.button !== 0)) return;

  swipeStart = {
    x: event.clientX,
    y: event.clientY,
    row,
    messageId: row.dataset.messageId
  };
});

document.addEventListener("pointermove", (event) => {
  if (!swipeStart) return;

  const distance = event.clientX - swipeStart.x;
  const verticalDistance = Math.abs(event.clientY - swipeStart.y);

  if (distance > 0 && distance < 45 && distance > verticalDistance) {
    swipeStart.row.style.transform = "translateX(" + distance + "px)";
  }
});

document.addEventListener("pointerup", (event) => {
  if (!swipeStart) return;

  const distance = event.clientX - swipeStart.x;
  const verticalDistance = Math.abs(event.clientY - swipeStart.y);
  const message = messages.find((item) => item.messageId === swipeStart.messageId);

  swipeStart.row.style.transform = "";

  if (message && distance > 55 && distance > verticalDistance * 1.2) {
    showReply(message);
  }

  swipeStart = null;
});

document.addEventListener("pointercancel", () => {
  if (!swipeStart) return;
  swipeStart.row.style.transform = "";
  swipeStart = null;
});

$("#conversation-messages").addEventListener("dblclick", (event) => {
  const row = event.target.closest(".message-row");
  const message = row && messages.find((item) => item.messageId === row.dataset.messageId);
  if (message) showReply(message);
});

$("#cancel-reply").addEventListener("click", () => {
  replyingTo = null;
  $("#reply-preview").hidden = true;
});

$("#emoji-toggle").addEventListener("click", () => {
  $("#emoji-picker").hidden = !$("#emoji-picker").hidden;
});

$("#emoji-picker").addEventListener("click", (event) => {
  const button = event.target.closest("[data-emoji]");
  if (!button) return;

  const input = $("#message-input");
  const start = input.selectionStart;
  const end = input.selectionEnd;
  const emoji = button.dataset.emoji;
  input.value = input.value.slice(0, start) + emoji + input.value.slice(end);
  input.focus();
  input.setSelectionRange(start + emoji.length, start + emoji.length);
});

$("#message-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const input = $("#message-input");
  const text = input.value.trim();

  if (!text || !socket?.connected) {
    if (!socket?.connected) $("#conversation-error").textContent = "Waiting for connection...";
    return;
  }

  socket.emit("sendMessage", {
    conversationId,
    text,
    replyTo: replyingTo
  }, (result) => {
    if (result?.error) $("#conversation-error").textContent = result.error;
  });

  input.value = "";
  replyingTo = null;
  $("#reply-preview").hidden = true;
  $("#emoji-picker").hidden = true;
});

initialize();
