export type PluginId = "railway" | "sentry" | "github-pulls";

export interface PluginMeta {
  id: PluginId;
  name: string;
  navLabel: string;
  blurb: string;
  brand: string;
  tokenLabel: string;
  tokenHint: string;
  tokenUrl: string;
  sourceLabel: string;
  sourceHint: string;
  itemsLabel: string;
  emptyMessage: string;
  filterByAuthor?: boolean;
}

export const PLUGIN_CATALOG: PluginMeta[] = [
  {
    id: "railway",
    name: "Railway",
    navLabel: "Railway",
    blurb: "Watch deployment status for the Railway projects you care about.",
    brand: "railway",
    tokenLabel: "Account token",
    tokenHint: "Create a token under Account Settings → Tokens. A team token also works.",
    tokenUrl: "https://railway.com/account/tokens",
    sourceLabel: "Projects",
    sourceHint: "Pick the Railway projects to show on the dashboard.",
    itemsLabel: "Recent deployments",
    emptyMessage: "No deployments found for the selected projects.",
  },
  {
    id: "sentry",
    name: "Sentry",
    navLabel: "Sentry",
    blurb: "Surface unresolved errors from the last two weeks.",
    brand: "sentry",
    tokenLabel: "Auth token",
    tokenHint: "Needs the project:read and event:read scopes.",
    tokenUrl: "https://sentry.io/settings/account/api/auth-tokens/",
    sourceLabel: "Projects",
    sourceHint: "Pick the Sentry projects to pull issues from.",
    itemsLabel: "Unresolved issues",
    emptyMessage: "Nothing unresolved in the last 14 days. Quiet is good.",
  },
  {
    id: "github-pulls",
    name: "GitHub Pull Requests",
    navLabel: "Pull Requests",
    blurb: "Track open pull requests across the repositories you choose.",
    brand: "github",
    tokenLabel: "Personal access token",
    tokenHint: "A fine-grained token with read access to Pull requests and Metadata.",
    tokenUrl: "https://github.com/settings/tokens",
    sourceLabel: "Repositories",
    sourceHint: "Pick repositories, then narrow each one to the people you want to watch.",
    itemsLabel: "Open pull requests",
    emptyMessage: "No open pull requests from the people you watch.",
    filterByAuthor: true,
  },
];

export function pluginMeta(id: string): PluginMeta | undefined {
  return PLUGIN_CATALOG.find((plugin) => plugin.id === id);
}
