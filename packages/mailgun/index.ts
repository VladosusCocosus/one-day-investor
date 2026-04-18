import FormData from "form-data";
import Mailgun from "mailgun.js";
import config from "@config";

const mailgun = new Mailgun(FormData);

let mg: ReturnType<typeof mailgun.client>;

function getClient() {
  if (!mg) {
    mg = mailgun.client({
      username: "api",
      key: config.get("mailgun.apiKey"),
    });
  }
  return mg;
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  headers?: Record<string, string>;
}): Promise<void> {
  const domain = config.get("mailgun.domain");
  const from = config.get("mailgun.from");
  await getClient().messages.create(domain, {
    from,
    to: [params.to],
    subject: params.subject,
    html: params.html,
    "h:List-Unsubscribe": params.headers?.["List-Unsubscribe"],
  });
}
