import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getSkillStats } from "@/lib/data";
import { getSkillCategories, type CategoryLabel } from "@/lib/skillCategories";

const LABEL_STYLES: Record<CategoryLabel, string> = {
  Rising: "border-success/30 text-success",
  Declining: "border-destructive/30 text-destructive",
  "High-paying": "border-accent-foreground/30 text-accent-foreground",
  "Remote-friendly": "border-accent-foreground/30 text-accent-foreground",
  "High-volume": "border-border text-muted-foreground",
};

export default async function SkillCategories() {
  const stats = await getSkillStats();
  const categories = await getSkillCategories(stats);
  const tagged = stats.filter((s) => (categories[s.skill] ?? []).length > 0);

  if (tagged.length === 0) return null;

  return (
    <Card className="mb-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <CardContent>
        <p className="mb-3 text-xs text-muted-foreground">Highlights</p>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {tagged.map((s) => (
            <div key={s.skill} className="flex items-center gap-1.5">
              <span className="text-sm font-medium">{s.skill}</span>
              {categories[s.skill].map((label) => (
                <Badge key={label} variant="outline" className={LABEL_STYLES[label]}>
                  {label}
                </Badge>
              ))}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
