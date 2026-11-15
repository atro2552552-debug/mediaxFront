import axios from "axios";
import newAlert from "./alert.js";
import { APP_URL } from "./config.js";

const $$ = (selector) => { return document.querySelector(selector)};

const email = $$(".email");
const password = $$(".password");
const button = $$(".form-button");

button.addEventListener("click", async () => {
  const emailValue = email?.value?.trim();
  const passwordValue = password?.value?.trim();

  if (!emailValue || !passwordValue) {
    newAlert("اكتب البريد الإلكتروني وكلمة المرور","error");
    return;
  }

  button.disabled = true;

  try {
    const formData = new URLSearchParams({
      email: emailValue,
      password: passwordValue
    });

    const res = await axios.post(
      APP_URL + "/login",
      formData,
      { withCredentials: true }
    );

    if (res.data?.statue === "success") {
      localStorage.setItem("if_login", "true");
      window.location.href = "home.html";
      return;
    }

    newAlert("لم يتم تسجيل الدخول. حاول مرة أخرى.","error");
  } catch (error) {
    const responseData = error.response?.data;
    const message = typeof responseData === "string" && !responseData.trim().startsWith("<!DOCTYPE")
      ? responseData
      : responseData?.message || "تعذر الاتصال بالخادم. تحقق من حالة الخدمة والإنترنت.";

    newAlert(message,"error");
  } finally {
    button.disabled = false;
  }
});
