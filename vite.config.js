import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const page = (path) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        index: page("./index.html"),
        welcome: page("./src/welcome.html"),
        friends: page("./src/friends.html"),
        life: page("./src/life.html"),
        signup: page("./src/signup.html"),
        login: page("./src/login.html"),
        forgot: page("./src/forgot.html"),
        reset: page("./src/reset.html"),
        home: page("./src/home.html"),
        user: page("./src/user.html"),
        search: page("./src/search.html"),
        createPost: page("./src/create-post.html"),
        conversations: page("./src/conversations.html"),
        conversation: page("./src/conversation.html")
      }
    }
  }
});
