/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      from: {},
      to: { circular: true },
    },
    {
      name: "shared-tidak-ke-atas",
      severity: "error",
      from: { path: "^src/shared" },
      to: { path: "^src/(features|server|app)" },
    },
    {
      name: "server-tidak-ke-ui",
      severity: "error",
      from: { path: "^src/server" },
      to: { path: "^src/(features|app|shared/ui)" },
    },
    {
      name: "fitur-lintas-lewat-index",
      severity: "error",
      from: { path: "^src/features/([^/]+)/" },
      to: {
        path: "^src/features/[^/]+/.+",
        pathNot: ["^src/features/$1/", "^src/features/[^/]+/index\\.ts$"],
      },
    },
  ],
  options: {
    tsConfig: { fileName: "tsconfig.json" },
    doNotFollow: { path: "node_modules" },
  },
};
