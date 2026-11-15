import axios from "axios";
import { APP_URL } from "./config.js";
import { uploadFile } from "./supabase.js";
import ExitPage from "../js/beforeExit.js";

ExitPage();

const $ = (selector) => document.querySelector(selector);

async function createPost() {
  const title = $(".post-content").value.trim();
  const file = $("#post-media").files[0];
  const button = $("#post-button");

  if (!title) return;

  if (file && file.size > 10 * 1024 * 1024) {
    alert("Choose a file smaller than 10 MB.");
    return;
  }

  button.disabled = true;
  button.textContent = file ? "Uploading..." : "Posting...";

  try {
    const postData = {
      title,
      security: $(".security").value,
      date: new Date()
    };

    if (file) {
      postData.file = await uploadFile(file, "posts");
      postData.typeFile = file.type;
    }

    const res = await axios.post(APP_URL + "/addPost", postData, { withCredentials: true });

    if (res.data.status === "success") {
      window.location.href = "home.html";
    }
  } catch (error) {
    alert(error.response?.data?.message || error.message || "Could not create post.");
    button.disabled = false;
    button.textContent = "Post";
  }
}

$("#post-button").addEventListener("click", createPost);

function getMyData() {
  const data = JSON.parse(localStorage.getItem("myData") || "null") || {};
  if (data.avatar) $(".myAvatar").setAttribute("src", data.avatar);
  $(".composer-name").textContent = data.fullname || "";
}

getMyData();
