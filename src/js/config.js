const localApiUrl = "https://sustenance-monumental-elephant.abasthan.app/api/auth";

export const APP_URL = (import.meta.env.VITE_API_URL || localApiUrl).replace(/\/+$/, "");
