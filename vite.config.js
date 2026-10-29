import { defineConfig } from "vite";

export default defineConfig({
  // Relative assets work at both /travel/ and a custom domain root.
  base: "./",
  plugins: [{
    name: "build-identity",
    transformIndexHtml(html) {
      return html.replace("__BUILD_COMMIT__", process.env.GITHUB_SHA || "local");
    },
  }],
});
