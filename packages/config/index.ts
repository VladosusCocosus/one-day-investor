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
  google: {
    clientId: {
      doc: "Google OAuth2 client ID",
      format: String,
      default: "",
      env: "GOOGLE_CLIENT_ID",
    },
    clientSecret: {
      doc: "Google OAuth2 client secret",
      format: String,
      default: "",
      env: "GOOGLE_CLIENT_SECRET",
      sensitive: true,
    },
    redirectUri: {
      doc: "Google OAuth2 redirect URI",
      format: String,
      default: "http://localhost:3000/auth/google/callback",
      env: "GOOGLE_REDIRECT_URI",
    },
  },
  frontendUrl: {
    doc: "Frontend URL for redirects and CORS",
    format: String,
    default: "http://localhost:5173",
    env: "FRONTEND_URL",
  },
  session: {
    maxAge: {
      doc: "Session max age in seconds",
      format: "int",
      default: 2592000,
      env: "SESSION_MAX_AGE",
    },
  },
  s3: {
    endpoint: {
      doc: "S3 endpoint URL (LocalStack or AWS)",
      format: String,
      default: "http://localhost:4566",
      env: "S3_ENDPOINT",
    },
    region: {
      doc: "S3 region",
      format: String,
      default: "eu-central-1",
      env: "S3_REGION",
    },
    accessKeyId: {
      doc: "S3 access key ID",
      format: String,
      default: "test",
      env: "S3_ACCESS_KEY_ID",
    },
    secretAccessKey: {
      doc: "S3 secret access key",
      format: String,
      default: "test",
      env: "S3_SECRET_ACCESS_KEY",
      sensitive: true,
    },
    bucket: {
      doc: "Default S3 bucket name",
      format: String,
      default: "blog-images",
      env: "S3_BUCKET",
    },
  },
  mailgun: {
    apiKey: {
      doc: "Mailgun API key (EU or US)",
      format: String,
      default: "",
      env: "MAILGUN_API_KEY",
      sensitive: true,
    },
    domain: {
      doc: "Mailgun sending domain",
      format: String,
      default: "",
      env: "MAILGUN_DOMAIN",
    },
    from: {
      doc: "Mailgun From header value",
      format: String,
      default: "",
      env: "MAILGUN_FROM",
    },
  },
});

config.validate({ allowed: "strict" });

export default config;
