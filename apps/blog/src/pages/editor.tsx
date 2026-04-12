import Html from "@kitajs/html";
import type { BlogPost } from "../db";
import { EditorLayout } from "../layout";

function PostRow({ post }: { post: BlogPost }) {
  const status = post.publish_date ? "Published" : "Draft";
  const statusColor = post.publish_date ? "text-emerald-400" : "text-yellow-400";

  return (
    <tr class="border-b border-gray-800/50">
      <td class="py-3 pr-4">
        <a href={`/editor/${post.id}`} class="font-medium text-white hover:text-emerald-300 transition-colors">
          {post.title}
        </a>
      </td>
      <td class="py-3 pr-4 text-sm text-gray-400">{post.slug}</td>
      <td class="py-3 pr-4">
        <span class={`text-xs font-medium ${statusColor}`}>{status}</span>
      </td>
      <td class="py-3 pr-4 text-sm text-gray-500">
        {post.tags.join(", ") || "—"}
      </td>
      <td class="py-3 text-right">
        <a href={`/${post.slug}`} class="text-xs text-emerald-400 hover:text-emerald-300 mr-3">
          View
        </a>
        <a href={`/editor/${post.id}`} class="text-xs text-gray-400 hover:text-white">
          Edit
        </a>
      </td>
    </tr>
  );
}

export function EditorListPage({ posts }: { posts: BlogPost[] }) {
  return (
    <EditorLayout title="Posts">
      <div class="flex items-center justify-between mb-8">
        <h1 class="text-2xl font-bold">Posts</h1>
        <a
          href="/editor/new"
          class="inline-flex h-9 items-center rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-500 transition-colors"
        >
          New Post
        </a>
      </div>
      {posts.length === 0 ? (
        <p class="text-gray-500">No posts yet. Create your first one.</p>
      ) : (
        <table class="w-full">
          <thead>
            <tr class="border-b border-gray-700 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              <th class="py-2 pr-4">Title</th>
              <th class="py-2 pr-4">Slug</th>
              <th class="py-2 pr-4">Status</th>
              <th class="py-2 pr-4">Tags</th>
              <th class="py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((post) => (
              <PostRow post={post} />
            ))}
          </tbody>
        </table>
      )}
    </EditorLayout>
  );
}

const blockTemplates: Record<string, string> = {
  hero: JSON.stringify(
    { type: "hero", label: "Label", title: "Title", subtitle: "Subtitle" },
    null,
    2
  ),
  prose: JSON.stringify(
    {
      type: "prose",
      label: "Label",
      heading: "Heading",
      paragraphs: ["First paragraph.", "Second paragraph."],
    },
    null,
    2
  ),
  "pull-quote": JSON.stringify(
    { type: "pull-quote", text: "Your quote here." },
    null,
    2
  ),
  comparison: JSON.stringify(
    {
      type: "comparison",
      label: "Label",
      heading: "Heading",
      intro: "Introduction text.",
      left: { label: "Left Column", items: ["Item 1", "Item 2"] },
      right: { label: "Right Column", items: ["Item 1", "Item 2"] },
      outro: "Closing text.",
    },
    null,
    2
  ),
  closing: JSON.stringify(
    { type: "closing", text: "Closing message.", author: "Author Name" },
    null,
    2
  ),
  image: JSON.stringify(
    { type: "image", src: "/image.jpg", alt: "Description", caption: "Caption" },
    null,
    2
  ),
};

export function EditorFormPage({
  post,
  error,
}: {
  post?: BlogPost;
  error?: string;
}) {
  const isNew = !post;
  const contentJson = post
    ? JSON.stringify(post.content, null, 2)
    : "[]";

  return (
    <EditorLayout title={isNew ? "New Post" : `Edit: ${post!.title}`}>
      <div class="flex items-center justify-between mb-8">
        <h1 class="text-2xl font-bold">{isNew ? "New Post" : "Edit Post"}</h1>
        <a href="/editor" class="text-sm text-gray-400 hover:text-white transition-colors">
          &larr; Back to list
        </a>
      </div>

      {error && (
        <div class="mb-6 rounded-lg bg-red-900/30 border border-red-800/50 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <form method="POST" action={isNew ? "/editor/new" : `/editor/${post!.id}`}>
        <div class="space-y-6">
          <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-1.5">Title</label>
              <input
                type="text"
                name="title"
                value={post?.title ?? ""}
                required
                class="w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-1.5">Slug</label>
              <input
                type="text"
                name="slug"
                value={post?.slug ?? ""}
                required
                pattern="[a-z0-9-]+"
                class="w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none"
                placeholder="my-post-slug"
              />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1.5">Excerpt</label>
            <input
              type="text"
              name="excerpt"
              value={post?.excerpt ?? ""}
              class="w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none"
              placeholder="Short description for the post list"
            />
          </div>

          <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-1.5">Tags (comma-separated)</label>
              <input
                type="text"
                name="tags"
                value={post?.tags.join(", ") ?? ""}
                class="w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none"
                placeholder="philosophy, investing"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-1.5">Publish Date (empty = draft)</label>
              <input
                type="date"
                name="publish_date"
                value={post?.publish_date ?? ""}
                class="w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <div class="flex items-center justify-between mb-1.5">
              <label class="block text-sm font-medium text-gray-300">Content (JSON blocks)</label>
              <div class="flex gap-2">
                {Object.keys(blockTemplates).map((type) => (
                  <button
                    type="button"
                    class="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                    onclick={`insertBlock('${type}')`}
                  >
                    +{type}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              id="content"
              name="content"
              rows={20}
              class="w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 font-mono text-sm text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none"
            >
              {contentJson}
            </textarea>
          </div>

          {!isNew && post!.og_image && (
            <div class="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
              <p class="text-xs font-medium text-gray-400 mb-2">OG Image</p>
              <img
                src={`${process.env.S3_ENDPOINT || "http://localhost:4566"}/${process.env.S3_BUCKET || "blog-images"}/${post!.og_image}`}
                alt="OG preview"
                class="rounded-md border border-gray-700 max-w-[400px]"
              />
            </div>
          )}

          <div class="flex gap-3">
            <button
              type="submit"
              class="inline-flex h-10 items-center rounded-md bg-emerald-600 px-5 text-sm font-semibold text-white hover:bg-emerald-500 transition-colors"
            >
              {isNew ? "Create Post" : "Save Changes"}
            </button>
            {!isNew && (
              <button
                type="submit"
                formaction={`/editor/${post!.id}/og`}
                class="inline-flex h-10 items-center rounded-md bg-indigo-900/40 px-5 text-sm font-medium text-indigo-300 hover:bg-indigo-900/60 transition-colors"
              >
                {post!.og_image ? "Regenerate OG Image" : "Generate OG Image"}
              </button>
            )}
            {!isNew && (
              <button
                type="submit"
                formaction={`/editor/${post!.id}/delete`}
                class="inline-flex h-10 items-center rounded-md bg-red-900/40 px-5 text-sm font-medium text-red-300 hover:bg-red-900/60 transition-colors"
                onclick="return confirm('Delete this post?')"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      </form>

      <script>
        {(`
          const templates = ${JSON.stringify(blockTemplates)};
          function insertBlock(type) {
            const ta = document.getElementById('content');
            try {
              const blocks = JSON.parse(ta.value);
              blocks.push(JSON.parse(templates[type]));
              ta.value = JSON.stringify(blocks, null, 2);
            } catch(e) {
              alert('Fix JSON first: ' + e.message);
            }
          }
        `)}
      </script>
    </EditorLayout>
  );
}
