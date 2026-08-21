import { useState } from "react";
import { FileTextIcon, ImageIcon, MessagesSquareIcon, MicIcon } from "lucide-react";
import { NavItem } from "@/components/NavItem";
import { Skeleton } from "@/components/ui/skeleton";
import { PortfolioShots } from "@/features/portfolio/PortfolioShots";
import { PortfolioVoice } from "@/features/portfolio/PortfolioVoice";
import { PortfolioChat } from "@/features/portfolio/PortfolioChat";
import { PortfolioOutput } from "@/features/portfolio/PortfolioOutput";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useSettings } from "@/hooks/useSettings";

interface PortfolioPanelProps {
  projectId: number;
}

type Section = "shots" | "voice" | "chat" | "output";

const SECTIONS = [
  { id: "shots" as const, label: "Screenshots", icon: ImageIcon },
  { id: "voice" as const, label: "Voice", icon: MicIcon },
  { id: "chat" as const, label: "Chat", icon: MessagesSquareIcon },
  { id: "output" as const, label: "Output", icon: FileTextIcon },
];

export function PortfolioPanel({ projectId }: PortfolioPanelProps) {
  const [section, setSection] = useState<Section>("shots");
  const { data, isLoading } = usePortfolio(projectId);
  const { data: settings } = useSettings();
  const provider = settings?.aiProvider ?? "claude-code";

  if (isLoading || !data) {
    return <Skeleton className="h-64 w-full" />;
  }

  const counts: Record<Section, number | undefined> = {
    shots: data.images.length,
    voice: undefined,
    chat: data.messages.filter((message) => message.role === "user").length,
    output: data.doc ? 1 : undefined,
  };

  return (
    <div className="grid grid-cols-[168px_1fr] gap-5">
      <nav className="space-y-1 pr-3">
        {SECTIONS.map((item) => (
          <NavItem
            key={item.id}
            icon={item.icon}
            label={item.label}
            active={section === item.id}
            count={counts[item.id]}
            onClick={() => setSection(item.id)}
          />
        ))}
      </nav>

      <div className="min-h-[320px]">
        {section === "shots" && (
          <PortfolioShots projectId={projectId} imagesDir={data.imagesDir} images={data.images} />
        )}
        {section === "voice" && <PortfolioVoice projectId={projectId} voice={data.voice} />}
        {section === "chat" && (
          <PortfolioChat projectId={projectId} provider={provider} messages={data.messages} />
        )}
        {section === "output" && (
          <PortfolioOutput
            projectId={projectId}
            provider={provider}
            imagesDir={data.imagesDir}
            doc={data.doc}
          />
        )}
      </div>
    </div>
  );
}
