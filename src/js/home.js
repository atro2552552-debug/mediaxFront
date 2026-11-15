import axios from "axios";
import { APP_URL } from "./config.js";
import timeAgo from "../js/changeDate.js";
import ExitPage from "../js/beforeExit.js";

const $ = (selector) => document.querySelector(selector);
const feed = $(".feed-scroll");
const fallbackAvatar = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRiRo5RsazUIy3LPn-DG57NPTKgVyRcUqqJODFRmkEdbg&s=10";
const loadedPosts = new Set();
const visibleVideos = new Map();
let skipPost = 0;
let loadingPosts = false;
let hasMorePosts = true;

function safeText(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatPostText(text = "") {
  return safeText(text)
    .replace(/#[\p{L}\p{N}_]+/gu, '<span class="post-tag">$&</span>')
    .replace(/\r?\n/g, "<br>");
}

const postsObserver = new IntersectionObserver((entries) => {
  if (entries.some((entry) => entry.isIntersecting)) {
    postsObserver.disconnect();
    getPosts();
  }
}, {
  root: feed,
  rootMargin: "0px 0px 100px 0px"
});

const videoObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      visibleVideos.set(entry.target, entry.intersectionRatio);
    } else {
      visibleVideos.delete(entry.target);
    }
  });

  const first = [...visibleVideos.entries()].sort((a, b) => b[1] - a[1])[0];
  const activeVideo = first && first[1] >= 0.4 ? first[0] : null;

  feed.querySelectorAll(".VideoPosts").forEach((video) => {
    if (video === activeVideo) {
      if (video.paused) video.play().catch(() => {});
    } else if (!video.paused) {
      video.pause();
    }
  });
}, {
  root: feed,
  threshold: [0, 0.4, 0.6, 1]
});

function renderPost(post, myData) {
  const owner = post.owner || {};
  const isMine = String(owner.id) === String(myData.id);
  const showMore = post.is_follow || isMine;
  const author = safeText(owner.fullname || "New user");
  const username = safeText(owner.username || "مستخدم جديد");
  const avatar = safeText(owner.avatar || fallbackAvatar);
  const verified = owner.verify
    ? '<svg class="verified-badge" viewBox="0 0 24 24" width="15" height="15" aria-label="Verified"><path fill="#1877F2" d="M12 1.5l2.4 1.6 2.9-.1 1.2 2.6 2.6 1.2-.1 2.9 1.6 2.3-1.6 2.4.1 2.9-2.6 1.2-1.2 2.6-2.9-.1-2.4 1.6-2.3-1.6-2.9.1-1.2-2.6L3 17.2l.1-2.9L1.5 12l1.6-2.3L3 6.8l2.6-1.2 1.2-2.6 2.9.1z"/><path d="m7.5 12.1 3 3 6-6" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    : "";
  const media = post.file
    ? '<div class="post-image">' +
        (String(post.type).includes("video")
          ? '<video class="VideoPosts" src="' + safeText(post.file) + '" muted playsinline preload="metadata"></video>'
          : '<img src="' + safeText(post.file) + '" alt="Post media" />') +
      '</div>'
    : "";
  const follow = showMore
    ? '<button class="post-more" type="button" aria-label="More options"><i class="fa-solid fa-ellipsis"></i></button>'
    : '<button class="followUser" type="button">Follow</button>';

  return '<article id="' + safeText(post.postID) + '" class="post-card">' +
    '<header id="' + safeText(owner.id || "") + '" class="post-header">' +
      '<img class="post-avatar" src="' + avatar + '" alt="" />' +
      '<span class="statusIcon ' + (owner.status === "online" ? "online" : "offline") + '"></span>' +
      '<div class="post-author"><h1>' + author + verified + '</h1><p>' + username + '</p></div>' +
      follow +
    '</header>' +
    '<p class="post-caption">' + formatPostText(post.title || "") + '</p>' +
    media +
    '<div class="post-actions">' +
      '<button class="post-action like-action" data-action="like" type="button"><i class="fa-regular fa-heart"></i><span class="action-count">' + (Number(post.reacts?.like) || 0) + '</span><span>Like</span></button>' +
      '<button class="post-action" type="button"><i class="fa-regular fa-comment"></i><span class="action-count">' + (Number(post.reacts?.comment) || 0) + '</span><span>Comment</span></button>' +
      '<button class="post-action" data-action="share" type="button"><i class="fa-solid fa-share"></i><span class="action-count">' + (Number(post.reacts?.share) || 0) + '</span><span>Share</span></button>' +
    '</div>' +
    '<p class="date-by">' + timeAgo(post.date) + '</p>' +
  '</article>';
}

function watchForMorePosts() {
  if (!hasMorePosts) return;

  const posts = feed.querySelectorAll(".post-card");
  if (posts.length < 2) return;

  postsObserver.disconnect();
  postsObserver.observe(posts[posts.length - 2]);
}

function watchVideos() {
  feed.querySelectorAll(".VideoPosts:not([data-watched])").forEach((video) => {
    video.dataset.watched = "true";
    videoObserver.observe(video);
  });
}

async function getPosts() {
  if (loadingPosts || !hasMorePosts) return;
  loadingPosts = true;

  try {
    const res = await axios.post(
      APP_URL + "/getPosts",
      { skipPost },
      { withCredentials: true }
    );
    const posts = res.data.data || [];
    const myData = JSON.parse(localStorage.getItem("myData") || "null") || {};

    if (!posts.length) {
      hasMorePosts = false;
      postsObserver.disconnect();
      return;
    }

    const newPosts = posts.filter((post) => !loadedPosts.has(post.postID));
    newPosts.forEach((post) => loadedPosts.add(post.postID));
    feed.insertAdjacentHTML("beforeend", newPosts.map((post) => renderPost(post, myData)).join(""));
    skipPost += posts.length;
    hasMorePosts = posts.length === 10;

    watchVideos();

    if (hasMorePosts) watchForMorePosts();
    else postsObserver.disconnect();
  } catch (error) {
    console.error("Could not load posts:", error);
  } finally {
    loadingPosts = false;
  }
}

feed.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action]");

  if (button) {
    const post = button.closest(".post-card");
    const counter = button.querySelector(".action-count");
    const type = button.dataset.action;
    button.disabled = true;

    try {
      await axios.post(
        APP_URL + "/updateReacts",
        { type, postId: post.id },
        { withCredentials: true }
      );
      counter.textContent = String((Number(counter.textContent) || 0) + 1);
      if (type === "like") button.querySelector("i").className = "fa-solid fa-heart";
    } catch (error) {
      button.disabled = false;
      console.error("Could not update reaction:", error);
    }
    return;
  }

  const followButton = event.target.closest(".followUser");
  if (!followButton) return;

  const ownerID = followButton.closest(".post-header").id;
  followButton.disabled = true;

  try {
    await axios.post(APP_URL + "/addFollower", { ownerID }, { withCredentials: true });
    followButton.textContent = "Following";
    setTimeout(() => followButton.remove(), 1200);
  } catch (error) {
    followButton.disabled = false;
    console.error("Could not follow user:", error);
  }
});

async function getMyAccount() {
  const cachedData = JSON.parse(localStorage.getItem("myData") || "null");

  if (cachedData?.avatar) {
    $(".avatarMy").src = cachedData.avatar;
    return;
  }

  const res = await axios.get(APP_URL + "/getMyData", { withCredentials: true });
  localStorage.setItem("myData", JSON.stringify(res.data));
  if (res.data.avatar) $(".avatarMy").src = res.data.avatar;
}

async function getUsers() {
  const res = await axios.post(APP_URL + "/getUsers", { limit: 5 }, { withCredentials: true });
  const myData = JSON.parse(localStorage.getItem("myData") || "null") || {};

  res.data.users.forEach((user) => {
    if (String(user._id) === String(myData.id)) return;

    $(".stories").insertAdjacentHTML("beforeend",
      '<div class="story"><span class="story-image"><img class="' +
      (user.status === "online" ? "onlineUser" : "offlineUser") +
      '" src="' + safeText(user.avatar || fallbackAvatar) +
      '" alt="" /></span><span class="story-name">' +
      safeText(user.fullname || "New user") + '</span></div>'
    );
  });
}

async function initializeHome() {
  try {
    await getMyAccount();
    await getUsers();
    await getPosts();
  } catch (error) {
    console.error("Could not load home:", error);
  }
}

initializeHome();
ExitPage();
