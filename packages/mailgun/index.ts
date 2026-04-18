import FormData from "form-data";
import Mailgun from "mailgun.js";
import config from "@config";

const mailgun = new Mailgun(FormData);

const mg = mailgun.client({
  username: "api",
  key: config.get("mailgun.apiKey")
});

const DOMAIN = config.get("mailgun.domain");
const FROM = config.get("mailgun.from");

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  headers?: Record<string, string>;
}): Promise<void> {
  await mg.messages.create(DOMAIN, {
    from: FROM,
    to: [params.to],
    subject: params.subject,
    html: params.html,
    "h:List-Unsubscribe": params.headers?.["List-Unsubscribe"],
  });
}
