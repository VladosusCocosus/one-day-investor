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

export function EditorFormPage({
  post,
  error,
}: {
  post?: BlogPost;
  error?: string;
}) {
  const isNew = !post;
  // Escape </script> sequences so post content can't break out of the script tag.
  const initialBlocksJson = JSON.stringify(post?.content ?? []).replace(
    /</g,
    "\\u003c"
  );

  const inputCls =
    "w-full rounded-md border border-gray-700 bg-gray-950 px-3 py-3 text-sm text-white placeholder-gray-600 focus:border-emerald-500 focus:outline-none";

  return (
    <EditorLayout title={isNew ? "New Post" : `Edit: ${post!.title}`}>
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-xl md:text-2xl font-bold">
          {isNew ? "New Post" : "Edit Post"}
        </h1>
        <a
          href="/editor"
          class="text-sm text-gray-400 hover:text-white transition-colors"
        >
          &larr; Back
        </a>
      </div>

      {error && (
        <div class="mb-6 rounded-lg bg-red-900/30 border border-red-800/50 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <form
        id="post-form"
        method="POST"
        action={isNew ? "/editor/new" : `/editor/${post!.id}`}
      >
        <div class="space-y-5">
          {/* Post details */}
          <section class="rounded-lg border border-gray-800 bg-gray-900/30 p-4 md:p-5 space-y-4">
            <h2 class="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Details
            </h2>

            <div>
              <label class="block text-xs font-medium text-gray-400 mb-1">
                Title
              </label>
              <input
                type="text"
                name="title"
                value={post?.title ?? ""}
                required
                class={inputCls}
              />
            </div>

            <div>
              <label class="block text-xs font-medium text-gray-400 mb-1">
                Slug
              </label>
              <input
                type="text"
                name="slug"
                value={post?.slug ?? ""}
                required
                pattern="[a-z0-9-]+"
                placeholder="my-post-slug"
                class={inputCls}
              />
            </div>

            <div>
              <label class="block text-xs font-medium text-gray-400 mb-1">
                Excerpt
              </label>
              <input
                type="text"
                name="excerpt"
                value={post?.excerpt ?? ""}
                placeholder="Short description for the post list"
                class={inputCls}
              />
            </div>

            <div>
              <label class="block text-xs font-medium text-gray-400 mb-1">
                Tags (comma-separated)
              </label>
              <input
                type="text"
                name="tags"
                value={post?.tags.join(", ") ?? ""}
                placeholder="philosophy, investing"
                class={inputCls}
              />
            </div>

            <div>
              <label class="block text-xs font-medium text-gray-400 mb-1">
                Publish date (empty = draft)
              </label>
              <input
                type="date"
                name="publish_date"
                value={post?.publish_date ?? ""}
                class={inputCls}
              />
            </div>
          </section>

          {/* Content blocks */}
          <section class="rounded-lg border border-gray-800 bg-gray-900/30 p-4 md:p-5">
            <h2 class="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4">
              Content blocks
            </h2>

            <div id="blocks-container" class="space-y-4"></div>

            <div class="mt-5 flex flex-wrap items-center gap-2">
              <select
                id="new-block-type"
                class="flex-1 min-w-[140px] rounded-md border border-gray-700 bg-gray-950 px-3 py-3 text-sm text-white focus:border-emerald-500 focus:outline-none"
              >
                <option value="hero">Hero</option>
                <option value="prose">Prose</option>
                <option value="pull-quote">Pull quote</option>
                <option value="comparison">Comparison</option>
                <option value="closing">Closing</option>
                <option value="image">Image</option>
              </select>
              <button
                type="button"
                class="h-11 rounded-md bg-emerald-600 px-5 text-sm font-semibold text-white hover:bg-emerald-500 transition-colors"
                onclick="blockEditor.addBlock(document.getElementById('new-block-type').value)"
              >
                + Add block
              </button>
            </div>

            <input type="hidden" name="content" id="content-json" value="[]" />
          </section>

          {/* OG image preview */}
          {!isNew && post!.og_image && (
            <section class="rounded-lg border border-gray-800 bg-gray-900/30 p-4 md:p-5">
              <p class="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                OG image
              </p>
              <img
                src={`${process.env.S3_ENDPOINT || "http://localhost:4566"}/${process.env.S3_BUCKET || "blog-images"}/${post!.og_image}`}
                alt="OG preview"
                class="rounded-md border border-gray-700 w-full max-w-[400px]"
              />
            </section>
          )}

          {/* Actions */}
          <div class="flex flex-col gap-2 sm:flex-row sm:gap-3">
            <button
              type="submit"
              class="inline-flex h-11 items-center justify-center rounded-md bg-emerald-600 px-5 text-sm font-semibold text-white hover:bg-emerald-500 transition-colors"
            >
              {isNew ? "Create post" : "Save changes"}
            </button>
            {!isNew && (
              <button
                type="submit"
                formaction={`/editor/${post!.id}/og`}
                class="inline-flex h-11 items-center justify-center rounded-md bg-indigo-900/40 px-5 text-sm font-medium text-indigo-300 hover:bg-indigo-900/60 transition-colors"
              >
                {post!.og_image ? "Regenerate OG image" : "Generate OG image"}
              </button>
            )}
            {!isNew && (
              <button
                type="submit"
                formaction={`/editor/${post!.id}/delete`}
                class="inline-flex h-11 items-center justify-center rounded-md bg-red-900/40 px-5 text-sm font-medium text-red-300 hover:bg-red-900/60 transition-colors"
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
          (function() {
            const SCHEMAS = {
              hero: {
                label: 'Hero',
                fields: [
                  { path: 'label', label: 'Label', type: 'text' },
                  { path: 'title', label: 'Title', type: 'text' },
                  { path: 'subtitle', label: 'Subtitle', type: 'text' },
                ],
                defaults: function() { return { type: 'hero', label: '', title: '', subtitle: '' }; },
              },
              prose: {
                label: 'Prose',
                fields: [
                  { path: 'label', label: 'Label', type: 'text' },
                  { path: 'heading', label: 'Heading', type: 'text' },
                  { path: 'paragraphs', label: 'Paragraphs (one per line)', type: 'lines' },
                ],
                defaults: function() { return { type: 'prose', label: '', heading: '', paragraphs: [] }; },
              },
              'pull-quote': {
                label: 'Pull quote',
                fields: [
                  { path: 'text', label: 'Quote text', type: 'textarea' },
                ],
                defaults: function() { return { type: 'pull-quote', text: '' }; },
              },
              comparison: {
                label: 'Comparison',
                fields: [
                  { path: 'label', label: 'Label', type: 'text' },
                  { path: 'heading', label: 'Heading', type: 'text' },
                  { path: 'intro', label: 'Intro', type: 'textarea' },
                  { path: 'left.label', label: 'Left column label', type: 'text' },
                  { path: 'left.items', label: 'Left items (one per line)', type: 'lines' },
                  { path: 'right.label', label: 'Right column label', type: 'text' },
                  { path: 'right.items', label: 'Right items (one per line)', type: 'lines' },
                  { path: 'outro', label: 'Outro', type: 'textarea' },
                ],
                defaults: function() {
                  return {
                    type: 'comparison', label: '', heading: '', intro: '',
                    left: { label: '', items: [] },
                    right: { label: '', items: [] },
                    outro: '',
                  };
                },
              },
              closing: {
                label: 'Closing',
                fields: [
                  { path: 'text', label: 'Closing text', type: 'textarea' },
                  { path: 'author', label: 'Author', type: 'text' },
                ],
                defaults: function() { return { type: 'closing', text: '', author: '' }; },
              },
              image: {
                label: 'Image',
                fields: [
                  { path: 'src', label: 'Image URL', type: 'text' },
                  { path: 'alt', label: 'Alt text', type: 'text' },
                  { path: 'caption', label: 'Caption', type: 'text' },
                ],
                defaults: function() { return { type: 'image', src: '', alt: '', caption: '' }; },
              },
            };

            let blocks = ${initialBlocksJson};
            if (!Array.isArray(blocks)) blocks = [];

            function getPath(obj, path) {
              return path.split('.').reduce(function(o, k) {
                return o == null ? undefined : o[k];
              }, obj);
            }
            function setPath(obj, path, val) {
              const keys = path.split('.');
              const last = keys.pop();
              let target = obj;
              for (let i = 0; i < keys.length; i++) {
                if (target[keys[i]] == null) target[keys[i]] = {};
                target = target[keys[i]];
              }
              target[last] = val;
            }
            function escAttr(s) {
              return String(s == null ? '' : s)
                .replace(/&/g, '&amp;').replace(/"/g, '&quot;')
                .replace(/</g, '&lt;').replace(/>/g, '&gt;');
            }
            function escText(s) {
              return String(s == null ? '' : s)
                .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            }

            function renderField(idx, field, value) {
              const id = 'block-' + idx + '-' + field.path.replace(/\\./g, '-');
              const labelHtml = '<label class="block text-xs font-medium text-gray-400 mb-1" for="' + id + '">' + escText(field.label) + '</label>';
              const baseCls = 'w-full rounded-md border border-gray-700 bg-gray-950 px-3 py-3 text-sm text-white placeholder-gray-600 focus:border-emerald-500 focus:outline-none';
              const setCall = "blockEditor.setField(" + idx + ", '" + field.path + "', this.value)";
              const setLinesCall = "blockEditor.setLines(" + idx + ", '" + field.path + "', this.value)";
              if (field.type === 'text') {
                return labelHtml + '<input id="' + id + '" type="text" value="' + escAttr(value) + '" class="' + baseCls + '" oninput="' + setCall + '" />';
              }
              if (field.type === 'textarea') {
                return labelHtml + '<textarea id="' + id + '" rows="3" class="' + baseCls + ' resize-y" oninput="' + setCall + '">' + escText(value) + '</textarea>';
              }
              if (field.type === 'lines') {
                const text = Array.isArray(value) ? value.join('\\n') : (value || '');
                return labelHtml + '<textarea id="' + id + '" rows="4" class="' + baseCls + ' resize-y" oninput="' + setLinesCall + '">' + escText(text) + '</textarea>';
              }
              return '';
            }

            function renderBlockCard(block, idx) {
              const schema = SCHEMAS[block.type];
              if (!schema) {
                return '<div class="rounded-lg border border-red-800 bg-red-900/20 p-4"><p class="text-sm text-red-300 mb-3">Unknown block type: ' + escText(block.type) + '</p><button type="button" class="h-10 rounded-md border border-red-800/50 bg-red-900/30 px-3 text-xs text-red-300" onclick="blockEditor.remove(' + idx + ')">Remove</button></div>';
              }
              let typeOptions = '';
              const keys = Object.keys(SCHEMAS);
              for (let i = 0; i < keys.length; i++) {
                const k = keys[i];
                typeOptions += '<option value="' + k + '"' + (k === block.type ? ' selected' : '') + '>' + escText(SCHEMAS[k].label) + '</option>';
              }
              let fieldsHtml = '';
              for (let i = 0; i < schema.fields.length; i++) {
                fieldsHtml += '<div class="mb-3">' + renderField(idx, schema.fields[i], getPath(block, schema.fields[i].path)) + '</div>';
              }
              const isFirst = idx === 0;
              const isLast = idx === blocks.length - 1;
              return '<div class="rounded-lg border border-gray-800 bg-gray-950/60 p-4">' +
                '<div class="flex items-center gap-2 mb-4">' +
                  '<span class="shrink-0 text-xs font-semibold text-emerald-400">#' + (idx + 1) + '</span>' +
                  '<select class="flex-1 min-w-0 rounded-md border border-gray-700 bg-gray-900 px-2 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none" onchange="blockEditor.changeType(' + idx + ', this.value)">' +
                    typeOptions +
                  '</select>' +
                  '<button type="button" aria-label="Move up" ' + (isFirst ? 'disabled' : '') + ' class="h-10 w-10 shrink-0 rounded-md border border-gray-700 bg-gray-900 text-gray-300 hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed" onclick="blockEditor.move(' + idx + ', -1)">\u2191</button>' +
                  '<button type="button" aria-label="Move down" ' + (isLast ? 'disabled' : '') + ' class="h-10 w-10 shrink-0 rounded-md border border-gray-700 bg-gray-900 text-gray-300 hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed" onclick="blockEditor.move(' + idx + ', 1)">\u2193</button>' +
                  '<button type="button" aria-label="Delete" class="h-10 w-10 shrink-0 rounded-md border border-red-800/50 bg-red-900/20 text-red-300 hover:bg-red-900/40" onclick="blockEditor.remove(' + idx + ')">\u00d7</button>' +
                '</div>' +
                fieldsHtml +
              '</div>';
            }

            function render() {
              const container = document.getElementById('blocks-container');
              if (blocks.length === 0) {
                container.innerHTML = '<p class="text-sm text-gray-500 italic py-4 text-center">No blocks yet. Pick a type below and tap Add.</p>';
                return;
              }
              container.innerHTML = blocks.map(renderBlockCard).join('');
            }

            window.blockEditor = {
              addBlock: function(type) {
                const schema = SCHEMAS[type];
                if (!schema) return;
                blocks.push(schema.defaults());
                render();
                setTimeout(function() {
                  const container = document.getElementById('blocks-container');
                  const last = container.lastElementChild;
                  if (last && last.scrollIntoView) last.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 50);
              },
              remove: function(idx) {
                if (!confirm('Delete this block?')) return;
                blocks.splice(idx, 1);
                render();
              },
              move: function(idx, dir) {
                const target = idx + dir;
                if (target < 0 || target >= blocks.length) return;
                const item = blocks.splice(idx, 1)[0];
                blocks.splice(target, 0, item);
                render();
              },
              changeType: function(idx, newType) {
                if (blocks[idx] && blocks[idx].type === newType) return;
                const schema = SCHEMAS[newType];
                if (!schema) { render(); return; }
                if (!confirm('Changing the block type will reset its fields. Continue?')) {
                  render();
                  return;
                }
                blocks[idx] = schema.defaults();
                render();
              },
              setField: function(idx, path, value) {
                if (!blocks[idx]) return;
                setPath(blocks[idx], path, value);
              },
              setLines: function(idx, path, value) {
                if (!blocks[idx]) return;
                const arr = value.split('\\n').map(function(l) { return l.trim(); }).filter(function(l) { return l.length > 0; });
                setPath(blocks[idx], path, arr);
              },
            };

            document.getElementById('post-form').addEventListener('submit', function() {
              document.getElementById('content-json').value = JSON.stringify(blocks);
            });

            render();
          })();
        `)}
      </script>
    </EditorLayout>
  );
}
