import Html from "@kitajs/html";
import { BlogNav, BlogFooter } from "./components";
import type { User } from "@types";

export function Layout({
  title,
  description,
  ogImage,
  user,
  children,
}: {
  title: string;
  description?: string;
  ogImage?: string | null;
  user?: User | null;
  children: string;
}) {
  const ogImageUrl = ogImage
    ? `${process.env.S3_PUBLIC_URL || process.env.S3_ENDPOINT || "http://localhost:4566"}/${process.env.S3_BUCKET || "blog-images"}/${ogImage}`
    : null;
  const ogAlt = description || title;
  const twitterTitle = `One Day Investor — ${title}`;

  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>One Day Investor — {title}</title>
        {description && <meta name="description" content={description} />}
        <meta property="og:title" content={`One Day Investor — ${title}`} />
        {description && <meta property="og:description" content={description} />}
        <meta property="og:type" content="article" />
        {ogImageUrl && <meta property="og:image" content={ogImageUrl} />}
        {ogImageUrl && <meta property="og:image:secure_url" content={ogImageUrl} />}
        {ogImageUrl && <meta property="og:image:type" content="image/png" />}
        {ogImageUrl && <meta property="og:image:width" content="1200" />}
        {ogImageUrl && <meta property="og:image:height" content="630" />}
        {ogImageUrl && <meta property="og:image:alt" content={ogAlt} />}
        {ogImageUrl && <meta name="twitter:card" content="summary_large_image" />}
        {ogImageUrl && <meta name="twitter:title" content={twitterTitle} />}
        {ogImageUrl && <meta name="twitter:description" content={ogAlt} />}
        {ogImageUrl && <meta name="twitter:image" content={ogImageUrl} />}
        {ogImageUrl && <meta name="twitter:image:alt" content={ogAlt} />}
        <script src="https://cdn.tailwindcss.com"></script>
        <script>
          {(`
            tailwind.config = {
              theme: {
                extend: {
                  colors: { emerald: tailwind.colors.emerald }
                }
              }
            }
          `)}
        </script>
        <style>
          {(`
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
            body { font-family: 'Inter', system-ui, sans-serif; }
          `)}
        </style>
      </head>
      <body
        class="min-h-screen text-emerald-50"
        style="background: radial-gradient(ellipse 900px 700px at 85% 115%, rgba(16, 185, 129, 0.28) 0%, transparent 55%), radial-gradient(ellipse 1400px 900px at 10% -10%, #0f6d4f 0%, #064e36 38%, #02281c 100%); background-attachment: fixed;"
      >
        <BlogNav user={user} />
        <main>{(children)}</main>
        <BlogFooter />
      </body>
    </html>
  );
}

export function EditorLayout({
  title,
  children,
}: {
  title: string;
  children: string;
}) {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{title} — ODI Blog Editor</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          {(`
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
            body { font-family: 'Inter', system-ui, sans-serif; }
          `)}
        </style>
      </head>
      <body class="min-h-screen bg-gray-950 text-gray-100">
        <header class="border-b border-gray-800 px-6 py-4">
          <div class="mx-auto flex max-w-[1200px] items-center justify-between">
            <a href="/editor" class="flex items-center gap-2.5 text-gray-100 hover:text-white">
              <span
                class="h-3 w-3 rounded-[3px]"
                style="background: linear-gradient(135deg, #6ee7b7, #10b981)"
              ></span>
              <span class="text-sm font-semibold tracking-[0.18em] uppercase">
                Blog Editor
              </span>
            </a>
            <a
              href="/"
              class="text-sm text-gray-400 hover:text-white transition-colors"
            >
              View Blog
            </a>
          </div>
        </header>
        <main class="mx-auto max-w-[1200px] px-6 py-8">
          {(children)}
        </main>
      </body>
    </html>
  );
}
