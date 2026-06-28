// vite.config.js
import { defineConfig } from "file:///F:/Bitupan%20DA/BGDERP/nexaerp/frontend/node_modules/vite/dist/node/index.js";
import react from "file:///F:/Bitupan%20DA/BGDERP/nexaerp/frontend/node_modules/@vitejs/plugin-react/dist/index.js";
var vite_config_default = defineConfig({
  plugins: [
    react()
  ],
  server: {
    port: 5173,
    proxy: {
      "/auth": "http://localhost:8000",
      "/hrm": "http://localhost:8000",
      "/leads": "http://localhost:8000",
      "/amc": "http://localhost:8000",
      "/service": "http://localhost:8000",
      "/ops": "http://localhost:8000",
      "/customers": "http://localhost:8000",
      "/service": "http://localhost:8000"
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJGOlxcXFxCaXR1cGFuIERBXFxcXEJHREVSUFxcXFxuZXhhZXJwXFxcXGZyb250ZW5kXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJGOlxcXFxCaXR1cGFuIERBXFxcXEJHREVSUFxcXFxuZXhhZXJwXFxcXGZyb250ZW5kXFxcXHZpdGUuY29uZmlnLmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9GOi9CaXR1cGFuJTIwREEvQkdERVJQL25leGFlcnAvZnJvbnRlbmQvdml0ZS5jb25maWcuanNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJ1xuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0J1xuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBwbHVnaW5zOiBbXG4gICAgcmVhY3QoKVxuICBdLFxuICBzZXJ2ZXI6IHtcbiAgICBwb3J0OiA1MTczLFxuICAgIHByb3h5OiB7XG4gICAgICAnL2F1dGgnOiAnaHR0cDovL2xvY2FsaG9zdDo4MDAwJyxcbiAgICAgICcvaHJtJzogICdodHRwOi8vbG9jYWxob3N0OjgwMDAnLFxuICAgICAgJy9sZWFkcyc6ICdodHRwOi8vbG9jYWxob3N0OjgwMDAnLFxuICAgICAgJy9hbWMnOiAnaHR0cDovL2xvY2FsaG9zdDo4MDAwJyxcbiAgICAgICcvc2VydmljZSc6ICdodHRwOi8vbG9jYWxob3N0OjgwMDAnLFxuICAgICAgJy9vcHMnOiAnaHR0cDovL2xvY2FsaG9zdDo4MDAwJyxcbiAgICAgICcvY3VzdG9tZXJzJzogJ2h0dHA6Ly9sb2NhbGhvc3Q6ODAwMCcsXG4gICAgICAnL3NlcnZpY2UnOiAnaHR0cDovL2xvY2FsaG9zdDo4MDAwJyxcbiAgICB9LFxuICB9LFxufSlcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBNlMsU0FBUyxvQkFBb0I7QUFDMVUsT0FBTyxXQUFXO0FBRWxCLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVM7QUFBQSxJQUNQLE1BQU07QUFBQSxFQUNSO0FBQUEsRUFDQSxRQUFRO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixPQUFPO0FBQUEsTUFDTCxTQUFTO0FBQUEsTUFDVCxRQUFTO0FBQUEsTUFDVCxVQUFVO0FBQUEsTUFDVixRQUFRO0FBQUEsTUFDUixZQUFZO0FBQUEsTUFDWixRQUFRO0FBQUEsTUFDUixjQUFjO0FBQUEsTUFDZCxZQUFZO0FBQUEsSUFDZDtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
