import convict from "convict";

const config = convict({
  postgres: {
    host: {
      doc: "PostgreSQL host",
      format: String,
      default: "localhost",
      env: "POSTGRES_HOST",
    },
    port: {
      doc: "PostgreSQL port",
      format: "port",
      default: 5432,
      env: "POSTGRES_PORT",
    },
    database: {
      doc: "PostgreSQL database name",
      format: String,
      default: "one_day_investor",
      env: "POSTGRES_DB",
    },
    user: {
      doc: "PostgreSQL user",
      format: String,
      default: "postgres",
      env: "POSTGRES_USER",
    },
    password: {
      doc: "PostgreSQL password",
      format: String,
      default: "postgres",
      env: "POSTGRES_PASSWORD",
      sensitive: true,
    },
  },
});

config.validate({ allowed: "strict" });

export default config;
