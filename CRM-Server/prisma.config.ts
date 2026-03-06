import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: "postgresql://homevale:homevale_pass@localhost:5433/homevale_crm",
  },
});
