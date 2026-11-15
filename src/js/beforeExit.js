import axios from "axios";
import { APP_URL } from "./config.js";

export default function ExitPage(){

window.addEventListener("pagehide", () => {
  fetch(`${APP_URL}/exit/close`, {
    method: "POST",
    credentials: "include",
    keepalive: true
  });
});

window.addEventListener("load", () => {
  fetch(`${APP_URL}/exit/open`, {
    method: "POST",
    credentials: "include"
  });
});

}