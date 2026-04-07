import { Card, CardContent } from "@/components/ui/card";

export function ProfilePage() {
  return (
    <div>
      <h1 className="text-xl font-bold text-foreground">Profile</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Manage your account settings
      </p>

      <Card className="mt-6">
        <CardContent className="flex h-[300px] items-center justify-center">
          <p className="text-sm text-muted-foreground">Profile settings will go here</p>
        </CardContent>
      </Card>
    </div>
  );
}
