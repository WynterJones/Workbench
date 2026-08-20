import { useState } from "react";
import { DownloadIcon, ExternalLinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useInstallSkill } from "@/hooks/useSkills";
import { openUrl } from "@/lib/openUrl";

const PACKAGE_PATTERN = /^([A-Za-z0-9._-]+\/[A-Za-z0-9._-]+|https:\/\/github\.com\/[A-Za-z0-9._\-/]+)$/;

export function InstallSkillPanel() {
  const [pkg, setPkg] = useState("");
  const install = useInstallSkill();
  const valid = PACKAGE_PATTERN.test(pkg.trim());

  return (
    <div className="space-y-1.5">
      <div className="flex gap-1.5">
        <Input
          value={pkg}
          onChange={(event) => setPkg(event.target.value)}
          placeholder="owner/repo to install…"
          className="font-mono text-xs"
        />
        <Button
          size="sm"
          disabled={!valid || install.isPending}
          onClick={() => install.mutate({ pkg: pkg.trim(), agents: [] }, { onSuccess: () => setPkg("") })}
          className="cursor-pointer"
        >
          <DownloadIcon />
        </Button>
      </div>
      {pkg.length > 0 && !valid && (
        <p className="text-[11px] text-warn">Use owner/repo, or a github.com URL.</p>
      )}
      {valid && (
        <code className="block truncate rounded bg-secondary px-2 py-1 font-mono text-[10px] text-muted-foreground">
          npx skills add {pkg.trim()} -g
        </code>
      )}
      <button
        type="button"
        onClick={() => openUrl("https://skills.sh")}
        className="flex cursor-pointer items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
      >
        Browse skills.sh
        <ExternalLinkIcon className="size-3" />
      </button>
    </div>
  );
}
