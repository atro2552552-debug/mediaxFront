import axios from "axios";
import { APP_URL } from "./config.js";
import { uploadFile } from "./supabase.js";
import ExitPage from "../js/beforeExit.js";

const $ = (selector) => document.querySelector(selector);
const fallbackAvatar = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRiRo5RsazUIy3LPn-DG57NPTKgVyRcUqqJODFRmkEdbg&s=10";

function getStoredData() {
  try {
    return JSON.parse(localStorage.getItem("myData") || "null") || {};
  } catch {
    return {};
  }
}

function safeText(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderProfile(data) {
  const username = data.username ? "@" + safeText(data.username.replace(/^@/, "")) : "مستخدم جديد";

  $(".profile-summary").innerHTML = '<img class="profile-avatar" src="' + safeText(data.avatar || fallbackAvatar) + '" alt="Profile photo" />' +
    '<div class="profile-details">' +
      '<h1>' + safeText(data.fullname || "") + '</h1>' +
      '<p>' + username + '</p>' +
      '<button class="edit-profile" type="button">Edit</button>' +
    '</div>';
}

async function getMyData() {
  const cachedData = getStoredData();

  try {
    const res = await axios.get(APP_URL + "/getMyData", { withCredentials: true });
    const data = { ...cachedData, ...res.data };
    localStorage.setItem("myData", JSON.stringify(data));
    renderProfile(data);
    return data;
  } catch (error) {
    if (!cachedData.id) throw error;
    renderProfile(cachedData);
    return cachedData;
  }
}

async function getUsers() {
  const res = await axios.post(APP_URL + "/getUsers", { limit: 5 }, { withCredentials: true });
  const myData = getStoredData();
  const users = res.data.users || [];
  const stories = users
    .filter((user) => String(user._id) !== String(myData.id))
    .map((user) => '<img src="' + safeText(user.avatar || fallbackAvatar) + '" alt="' + safeText(user.fullname || "Story") + '" />')
    .join("");

  $(".profile-stories").innerHTML = stories;
}

async function getReactsMe() {
  const res = await axios.get(APP_URL + "/getReactsMe", { withCredentials: true });
  const { likes, followers, posts } = res.data;

  $(".profile-stats").innerHTML = '<div class="profile-stat">' +
      '<strong>' + (Number(likes) || 0) + '</strong><span>Likes</span>' +
    '</div>' +
    '<div class="profile-stat">' +
      '<strong>' + (Number(followers) || 0) + '</strong><span>Followers</span>' +
    '</div>' +
    '<div class="profile-stat">' +
      '<strong>' + (Number(posts) || 0) + '</strong><span>Post</span>' +
    '</div>';
}

async function getMediaFiles() {
  const res = await axios.get(APP_URL + "/getMediaMe", { withCredentials: true });
  const posts = res.data.posts || [];
  const columns = [[], []];

  posts.forEach((post, index) => {
    const shape = index % 3 === 0 ? "gallery-tall" : index % 3 === 1 ? "gallery-square" : "gallery-medium";
    const isVideo = String(post.type || "").toLowerCase().includes("video");
    const media = isVideo
      ? '<video class="gallery-photo ' + shape + '" src="' + safeText(post.file) + '" muted playsinline preload="metadata"></video>'
      : '<img class="gallery-photo ' + shape + '" src="' + safeText(post.file) + '" alt="' + safeText(post.title || "Profile post") + '" />';
    const item = '<a class="gallery-item" href="' + safeText(post.file) + '" target="_blank" rel="noopener">' + media + '</a>';

    columns[index % 2].push(item);
  });

  $(".profile-gallery").innerHTML = columns
    .map((items) => '<div class="gallery-column">' + items.join("") + '</div>')
    .join("");
}

function setModalOpen(isOpen) {
  const modal = $("#profile-edit-modal");
  modal.hidden = !isOpen;
  document.body.classList.toggle("edit-profile-open", isOpen);

  if (isOpen) {
    const data = getStoredData();
    $("#edit-fullname").value = data.fullname || "";
    $("#edit-username").value = (data.username || "").replace(/^@/, "");
    $("#edit-avatar-preview").src = data.avatar || fallbackAvatar;
    $("#edit-avatar").value = "";
    $("#edit-message").textContent = "";
    $("#edit-fullname").focus();
  }
}

$(".profile-summary").addEventListener("click", (event) => {
  if (event.target.closest(".edit-profile")) setModalOpen(true);
});

$("#edit-avatar").addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (file) $("#edit-avatar-preview").src = URL.createObjectURL(file);
});

document.querySelectorAll("[data-close-edit]").forEach((button) => {
  button.addEventListener("click", () => setModalOpen(false));
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !$("#profile-edit-modal").hidden) setModalOpen(false);
});

$("#profile-edit-form").addEventListener("submit", async (event) => {
  event.preventDefault();

  const saveButton = $("#edit-save");
  const message = $("#edit-message");
  const fullname = $("#edit-fullname").value.trim();
  const username = $("#edit-username").value.trim().replace(/^@/, "");
  const file = $("#edit-avatar").files[0];

  if (!fullname || !username) {
    message.textContent = "Enter your name and username.";
    return;
  }

  if (file && file.size > 10 * 1024 * 1024) {
    message.textContent = "Choose an image smaller than 10 MB.";
    return;
  }

  saveButton.disabled = true;
  saveButton.textContent = "Saving...";
  message.textContent = "";

  try {
    const payload = { fullname, username };
    if (file) payload.avatar = await uploadFile(file, "avatars");

    const res = await axios.patch(APP_URL + "/updateProfile", payload, { withCredentials: true });
    const data = { ...getStoredData(), ...res.data.profile };
    localStorage.setItem("myData", JSON.stringify(data));
    renderProfile(data);
    setModalOpen(false);
  } catch (error) {
    message.textContent = error.response?.data?.message || "Could not save your profile. Try again.";
  } finally {
    saveButton.disabled = false;
    saveButton.textContent = "Save changes";
  }
});

async function initializeProfile() {
  try {
    await getMyData();
    await Promise.allSettled([getUsers(), getReactsMe(), getMediaFiles()]);
  } catch (error) {
    console.error("Could not load profile:", error);
  }
}

initializeProfile();
ExitPage();
