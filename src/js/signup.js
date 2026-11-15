import axios from "axios";
import newAlert from "./alert.js";
import { APP_URL } from "./config.js";

const $$ = (selector) => { return document.querySelector(selector)};

const fullName = $$(".fullname");
const email = $$(".email");
const password = $$(".password");
const confirmPassword = $$(".confirmPassword");
const button = $$(".form-button");

button.addEventListener("click",async () => {
  const nameValue = fullName?.value?.trim();
  const emailValue = email?.value?.trim().toLowerCase();
  const passwordValue = password?.value?.trim();
  const confirmValue = confirmPassword?.value?.trim();

  if (!nameValue || !emailValue || !passwordValue || !confirmValue) {
    newAlert("اكتب البيانات كلها","error");
    return;
  }

  if (passwordValue !== confirmValue) {
    newAlert("كلمتا المرور غير متطابقتين","error");
    return;
  }

  button.disabled = true;

  try {
    const formData = new URLSearchParams({
      fullname: nameValue,
      email: emailValue,
      password: passwordValue
    });

    const res = await axios.post(APP_URL + "/sign", formData);

    if (res.data === "success") {
      newAlert("تم إنشاء الحساب بنجاح","success");
      setTimeout(() => {
        window.location.href = "login.html";
      }, 700);
      return;
    }

    newAlert("لم يتم إنشاء الحساب. حاول مرة أخرى.","error");
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
