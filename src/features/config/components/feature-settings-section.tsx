import { useFormContext } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import type { SystemConfig } from "@/features/config/config.schema";
import { m } from "@/paraglide/messages";

export function FeatureSettingsSection() {
  const { watch, setValue } = useFormContext<SystemConfig>();

  const commentsEnabled = watch("feature.commentsEnabled") ?? true;
  const guestbookEnabled = watch("feature.guestbookEnabled") ?? true;

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-700">
      {/* Comments Toggle */}
      <section className="border border-border/30 bg-background/50 p-8 space-y-6">
        <div className="space-y-1">
          <h3 className="text-lg font-serif font-medium">
            {m.feature_comments_title()}
          </h3>
          <p className="text-sm text-muted-foreground">
            {m.feature_comments_desc()}
          </p>
        </div>

        <label className="flex cursor-pointer items-center gap-4 border border-border/20 bg-muted/10 p-4 transition-colors hover:bg-muted/20">
          <Checkbox
            checked={commentsEnabled}
            onCheckedChange={(checked) =>
              setValue("feature.commentsEnabled", !!checked, {
                shouldDirty: true,
              })
            }
          />
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-medium text-foreground">
              {m.feature_comments_toggle_label()}
            </p>
            <p className="text-sm text-muted-foreground">
              {m.feature_comments_toggle_desc()}
            </p>
          </div>
        </label>
      </section>

      {/* Guestbook Toggle */}
      <section className="border border-border/30 bg-background/50 p-8 space-y-6">
        <div className="space-y-1">
          <h3 className="text-lg font-serif font-medium">
            {m.feature_guestbook_title()}
          </h3>
          <p className="text-sm text-muted-foreground">
            {m.feature_guestbook_desc()}
          </p>
        </div>

        <label className="flex cursor-pointer items-center gap-4 border border-border/20 bg-muted/10 p-4 transition-colors hover:bg-muted/20">
          <Checkbox
            checked={guestbookEnabled}
            onCheckedChange={(checked) =>
              setValue("feature.guestbookEnabled", !!checked, {
                shouldDirty: true,
              })
            }
          />
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-medium text-foreground">
              {m.feature_guestbook_toggle_label()}
            </p>
            <p className="text-sm text-muted-foreground">
              {m.feature_guestbook_toggle_desc()}
            </p>
          </div>
        </label>
      </section>
    </div>
  );
}
