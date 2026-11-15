import axios from "axios";
import { APP_URL } from "./config.js";

const $ = (selector) => document.querySelector(selector);
const fallbackAvatar = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRiRo5RsazUIy3LPn-DG57NPTKgVyRcUqqJODFRmkEdbg&s=10";
let timer;
let requestNumber = 0;

function safeText(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function showUsers(users) {
  $("#search-count").textContent = users.length ? String(users.length) : "";

  if (!users.length) {
    $("#user-results").innerHTML = '<div class="search-state"><i class="fa-regular fa-user" aria-hidden="true"></i><span>No users found.</span></div>';
    return;
  }

  $("#user-results").innerHTML = users.map((user) => {
    const name = safeText(user.fullname || "New user");
    const username = user.username ? "@" + safeText(String(user.username).replace(/^@/, "")) : "Media X user";
    const status = String(user.status || "").toLowerCase() === "online" ? "online" : "";

    return '<article class="user-result">' +
      '<span class="user-result-avatar-wrap">' +
        '<img class="user-result-avatar" src="' + safeText(user.avatar || fallbackAvatar) + '" alt="' + name + '" />' +
        '<span class="user-result-status ' + status + '"></span>' +
      '</span>' +
      '<div class="user-result-info"><h3>' + name + '</h3><p>' + username + '</p></div>' +
    '</article>';
  }).join("");
}

async function searchUsers(value = "") {
  const currentRequest = ++requestNumber;
  $("#user-results").innerHTML = '<div class="search-state"><i class="fa-solid fa-spinner" aria-hidden="true"></i><span>Searching...</span></div>';

  try {
    const res = await axios.post(
      APP_URL + "/getUsers",
      { search: value.trim().replace(/^@/, ""), limit: 50 },
      { withCredentials: true }
    );

    if (currentRequest === requestNumber) showUsers(res.data.users || []);
  } catch {
    if (currentRequest !== requestNumber) return;
    $("#search-count").textContent = "";
    $("#user-results").innerHTML = '<div class="search-state"><i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i><span>Could not load people. Try again.</span></div>';
  }
}

$("#user-search").addEventListener("input", () => {
  const value = $("#user-search").value;
  $("#search-clear").hidden = !value;
  clearTimeout(timer);
  timer = setTimeout(() => searchUsers(value), 250);
});

$("#search-clear").addEventListener("click", () => {
  clearTimeout(timer);
  $("#user-search").value = "";
  $("#search-clear").hidden = true;
  searchUsers();
  $("#user-search").focus();
});

searchUsers();