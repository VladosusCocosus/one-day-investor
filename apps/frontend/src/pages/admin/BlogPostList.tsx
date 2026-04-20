import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { blogApi } from "@/lib/blogApi";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, ExternalLink } from "lucide-react";

interface BlogPost {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  tags: string[];
  publish_date: string | null;
  created_at: string;
  updated_at: string;
}

export function BlogPostList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["admin", "blog", "posts"],
    queryFn: async () => {
      const res = await blogApi.get<BlogPost[]>("/api/admin/posts");
      return res.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await blogApi.delete(`/api/admin/posts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "blog", "posts"] });
    },
  });

  const handleDelete = (id: number, title: string) => {
    if (!confirm(t("blog.deleteConfirm", { title }))) return;
    deleteMutation.mutate(id);
  };

  const blogUrl = import.meta.env.VITE_BLOG_URL || "https://blog.odinvestor.net";

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">{t("blog.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("blog.subtitle")}
          </p>
        </div>
        <Button size="sm" onClick={() => navigate("/admin/blog/new")}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          {t("blog.newPost")}
        </Button>
      </div>

      {isLoading ? (
        <div className="mt-8 text-sm text-muted-foreground">{t("common.loading")}</div>
      ) : posts.length === 0 ? (
        <div className="mt-8 text-sm text-muted-foreground">
          {t("blog.noPostsYet")}
        </div>
      ) : (
        <div className="mt-6 rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("blog.columnTitle")}
                </th>
                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hidden sm:table-cell">
                  {t("blog.columnStatus")}
                </th>
                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hidden md:table-cell">
                  {t("blog.columnTags")}
                </th>
                <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("blog.columnActions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr key={post.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <button
                      onClick={() => navigate(`/admin/blog/${post.id}`)}
                      className="font-medium text-foreground hover:text-primary transition-colors text-left"
                    >
                      {post.title}
                    </button>
                    <div className="text-xs text-muted-foreground mt-0.5">{post.slug}</div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        post.publish_date
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {post.publish_date ? t("blog.published") : t("blog.draft")}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-xs text-muted-foreground">
                    {post.tags.join(", ") || "\u2014"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {post.publish_date && (
                        <a
                          href={`${blogUrl}/${post.slug}`}
                          target="_blank"
                          rel="noopener"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                      <button
                        onClick={() => navigate(`/admin/blog/${post.id}`)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(post.id, post.title)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
