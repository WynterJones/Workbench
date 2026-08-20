use std::fs;
use std::path::PathBuf;

use serde::{Deserialize, Serialize};

use crate::files::fs_ops::guard_existing;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StarterTemplate {
    pub id: String,
    pub name: String,
    pub description: String,
    pub stack: Vec<String>,
    pub tags: Vec<String>,
    pub command: String,
    pub docs_url: String,
    pub category: String,
}

const DEFAULT_STARTERS_JSON: &str = r#"[
  {"id":"vite-react-ts","name":"Vite + React (TS)","description":"Minimal React SPA with TypeScript and fast HMR.","stack":["React","TypeScript","Vite"],"tags":["spa","react"],"command":"npm create vite@latest {{name}} -- --template react-ts","docsUrl":"https://vite.dev/guide/","category":"react"},
  {"id":"vite-react-swc","name":"Vite + React (SWC)","description":"React SPA using the SWC compiler for faster builds.","stack":["React","TypeScript","Vite"],"tags":["spa","react"],"command":"npm create vite@latest {{name}} -- --template react-swc-ts","docsUrl":"https://vite.dev/guide/","category":"react"},
  {"id":"vite-react-js","name":"Vite + React (JS)","description":"Plain JavaScript React SPA, no TypeScript.","stack":["React","JavaScript","Vite"],"tags":["spa","react"],"command":"npm create vite@latest {{name}} -- --template react","docsUrl":"https://vite.dev/guide/","category":"react"},
  {"id":"tanstack-start","name":"TanStack Start","description":"Full-stack React on TanStack Router with SSR built in.","stack":["React","TypeScript","Vite"],"tags":["fullstack","react","ssr"],"command":"npx create-tsrouter-app@latest {{name}} --add-ons start","docsUrl":"https://tanstack.com/start/latest","category":"react"},
  {"id":"tanstack-router-query","name":"TanStack Router + Query","description":"Type-safe routing with TanStack Query wired in.","stack":["React","TypeScript","Vite"],"tags":["spa","react","data-fetching"],"command":"npx create-tsrouter-app@latest {{name}} --add-ons tanstack-query","docsUrl":"https://tanstack.com/router/latest","category":"react"},
  {"id":"react-router-7","name":"React Router 7","description":"Official React Router framework template with SSR.","stack":["React","TypeScript"],"tags":["fullstack","react","ssr"],"command":"npx create-react-router@latest {{name}}","docsUrl":"https://reactrouter.com/","category":"react"},
  {"id":"remix","name":"Remix","description":"Web framework focused on web standards and nested routing.","stack":["React","TypeScript","Remix"],"tags":["fullstack","react","ssr"],"command":"npx create-remix@latest {{name}}","docsUrl":"https://remix.run/docs","category":"react"},
  {"id":"refine","name":"Refine","description":"React framework for admin panels, dashboards and internal tools.","stack":["React","TypeScript"],"tags":["dashboard","admin","react"],"command":"npm create refine-app@latest {{name}}","docsUrl":"https://refine.dev/docs/","category":"react"},
  {"id":"redwood","name":"RedwoodJS","description":"Full-stack React framework with Prisma and GraphQL.","stack":["React","TypeScript","Prisma"],"tags":["fullstack","graphql","react"],"command":"npx create-redwood-app@latest {{name}}","docsUrl":"https://redwoodjs.com/docs","category":"react"},
  {"id":"nextjs","name":"Next.js","description":"React framework with app router, SSR and API routes.","stack":["React","TypeScript","Next.js"],"tags":["fullstack","react","ssr"],"command":"npx create-next-app@latest {{name}}","docsUrl":"https://nextjs.org/docs","category":"nextjs"},
  {"id":"nextjs-tailwind","name":"Next.js + Tailwind","description":"Next.js app router preconfigured with Tailwind CSS.","stack":["React","TypeScript","Next.js","Tailwind"],"tags":["fullstack","react","styling"],"command":"npx create-next-app@latest {{name}} --tailwind --app --ts --eslint","docsUrl":"https://nextjs.org/docs","category":"nextjs"},
  {"id":"nextjs-shadcn","name":"Next.js + shadcn/ui","description":"The official shadcn/ui Next.js starter with the component system ready.","stack":["React","TypeScript","Next.js","Tailwind","shadcn/ui"],"tags":["fullstack","ui","react"],"command":"npx degit shadcn-ui/next-template {{name}}","docsUrl":"https://ui.shadcn.com/docs/installation/next","category":"nextjs"},
  {"id":"nextjs-taxonomy","name":"Taxonomy (Next.js SaaS)","description":"Opinionated Next.js app with auth, subscriptions and MDX docs.","stack":["React","TypeScript","Next.js","Prisma"],"tags":["saas","auth","payments"],"command":"npx degit shadcn-ui/taxonomy {{name}}","docsUrl":"https://github.com/shadcn-ui/taxonomy","category":"nextjs"},
  {"id":"nextjs-precedent","name":"Precedent","description":"Next.js starter with auth, database, animations and analytics.","stack":["React","TypeScript","Next.js"],"tags":["saas","auth","starter"],"command":"npx degit steven-tey/precedent {{name}}","docsUrl":"https://github.com/steven-tey/precedent","category":"nextjs"},
  {"id":"nextjs-commerce","name":"Next.js Commerce","description":"Production ecommerce storefront template from Vercel.","stack":["React","TypeScript","Next.js"],"tags":["ecommerce","storefront"],"command":"npx degit vercel/commerce {{name}}","docsUrl":"https://vercel.com/templates/next.js/nextjs-commerce","category":"nextjs"},
  {"id":"nextjs-subscriptions","name":"Next.js Subscriptions","description":"SaaS starter with Stripe subscriptions and Supabase auth.","stack":["React","TypeScript","Next.js","Supabase","Stripe"],"tags":["saas","payments","auth"],"command":"npx degit vercel/nextjs-subscription-payments {{name}}","docsUrl":"https://github.com/vercel/nextjs-subscription-payments","category":"nextjs"},
  {"id":"t3-stack","name":"T3 Stack","description":"Next.js with tRPC, Prisma, Tailwind and NextAuth.","stack":["React","TypeScript","Next.js","tRPC","Prisma"],"tags":["fullstack","typesafe","auth"],"command":"npm create t3-app@latest {{name}}","docsUrl":"https://create.t3.gg/","category":"nextjs"},
  {"id":"shadcn-vite","name":"shadcn/ui + Vite","description":"Vite React app with shadcn/ui and Tailwind configured.","stack":["React","TypeScript","Vite","Tailwind","shadcn/ui"],"tags":["ui","spa"],"command":"npm create vite@latest {{name}} -- --template react-ts","docsUrl":"https://ui.shadcn.com/docs/installation/vite","category":"ui"},
  {"id":"shadcn-dashboard","name":"shadcn Dashboard","description":"Admin dashboard layout built from shadcn/ui blocks.","stack":["React","TypeScript","Tailwind","shadcn/ui"],"tags":["dashboard","admin","ui"],"command":"npx shadcn@latest init && npx shadcn@latest add dashboard-01","docsUrl":"https://ui.shadcn.com/blocks","category":"ui"},
  {"id":"shadcn-login","name":"shadcn Auth screens","description":"Login and signup blocks from the shadcn/ui block library.","stack":["React","TypeScript","Tailwind","shadcn/ui"],"tags":["auth","ui"],"command":"npx shadcn@latest add login-01 signup-01","docsUrl":"https://ui.shadcn.com/blocks","category":"ui"},
  {"id":"shadcn-sidebar","name":"shadcn App Shell","description":"Sidebar application shell from the shadcn/ui blocks.","stack":["React","TypeScript","Tailwind","shadcn/ui"],"tags":["ui","layout"],"command":"npx shadcn@latest add sidebar-01","docsUrl":"https://ui.shadcn.com/blocks","category":"ui"},
  {"id":"vite-vue","name":"Vite + Vue (TS)","description":"Vue 3 SPA with TypeScript and Vite.","stack":["Vue","TypeScript","Vite"],"tags":["spa","vue"],"command":"npm create vite@latest {{name}} -- --template vue-ts","docsUrl":"https://vite.dev/guide/","category":"vue"},
  {"id":"vue-official","name":"Vue (official CLI)","description":"Vue 3 project with router, Pinia and testing options.","stack":["Vue","TypeScript"],"tags":["spa","vue"],"command":"npm create vue@latest {{name}}","docsUrl":"https://vuejs.org/guide/quick-start","category":"vue"},
  {"id":"nuxt","name":"Nuxt","description":"Full-stack Vue framework with file-based routing and SSR.","stack":["Vue","TypeScript","Nuxt"],"tags":["fullstack","vue","ssr"],"command":"npx nuxi@latest init {{name}}","docsUrl":"https://nuxt.com/docs","category":"vue"},
  {"id":"nuxt-ui","name":"Nuxt UI","description":"Nuxt starter with the official Nuxt UI component library.","stack":["Vue","TypeScript","Nuxt","Tailwind"],"tags":["fullstack","ui","vue"],"command":"npx nuxi@latest init {{name}} -t ui","docsUrl":"https://ui.nuxt.com/","category":"vue"},
  {"id":"nuxt-content","name":"Nuxt Content","description":"Markdown-driven Nuxt site for blogs and docs.","stack":["Vue","TypeScript","Nuxt"],"tags":["blog","cms","content"],"command":"npx nuxi@latest init {{name}} -t content","docsUrl":"https://content.nuxt.com/","category":"vue"},
  {"id":"sveltekit","name":"SvelteKit","description":"Svelte application framework with SSR and file routing.","stack":["Svelte","TypeScript"],"tags":["fullstack","svelte","ssr"],"command":"npx sv create {{name}}","docsUrl":"https://svelte.dev/docs/kit","category":"svelte"},
  {"id":"vite-svelte","name":"Vite + Svelte (TS)","description":"Svelte SPA with TypeScript, no framework layer.","stack":["Svelte","TypeScript","Vite"],"tags":["spa","svelte"],"command":"npm create vite@latest {{name}} -- --template svelte-ts","docsUrl":"https://vite.dev/guide/","category":"svelte"},
  {"id":"skeleton-ui","name":"Skeleton UI","description":"SvelteKit with the Skeleton component and design system.","stack":["Svelte","TypeScript","Tailwind"],"tags":["ui","svelte"],"command":"npx sv create --template minimal {{name}}","docsUrl":"https://www.skeleton.dev/","category":"svelte"},
  {"id":"astro","name":"Astro","description":"Content-focused site framework that ships zero JS by default.","stack":["Astro","TypeScript"],"tags":["static","content"],"command":"npm create astro@latest {{name}}","docsUrl":"https://docs.astro.build/","category":"astro"},
  {"id":"astro-blog","name":"Astro Blog","description":"Astro blog template with markdown content collections.","stack":["Astro","TypeScript","Markdown"],"tags":["blog","content","static"],"command":"npm create astro@latest {{name}} -- --template blog","docsUrl":"https://docs.astro.build/en/tutorial/0-introduction/","category":"astro"},
  {"id":"astro-starlight","name":"Starlight Docs","description":"Documentation site built on Astro's Starlight theme.","stack":["Astro","TypeScript"],"tags":["docs","content","static"],"command":"npm create astro@latest {{name}} -- --template starlight","docsUrl":"https://starlight.astro.build/","category":"astro"},
  {"id":"astro-minimal","name":"Astro Minimal","description":"Empty Astro project with nothing preinstalled.","stack":["Astro","TypeScript"],"tags":["static"],"command":"npm create astro@latest {{name}} -- --template minimal","docsUrl":"https://docs.astro.build/","category":"astro"},
  {"id":"vite-solid","name":"Vite + Solid","description":"SolidJS SPA with fine-grained reactivity.","stack":["Solid","TypeScript","Vite"],"tags":["spa"],"command":"npm create vite@latest {{name}} -- --template solid-ts","docsUrl":"https://www.solidjs.com/guides/getting-started","category":"frontend"},
  {"id":"qwik","name":"Qwik","description":"Resumable framework with near-zero JS on first load.","stack":["Qwik","TypeScript"],"tags":["fullstack","performance"],"command":"npm create qwik@latest basic {{name}}","docsUrl":"https://qwik.dev/docs/","category":"frontend"},
  {"id":"angular","name":"Angular","description":"Batteries-included application framework from Google.","stack":["Angular","TypeScript"],"tags":["spa","enterprise"],"command":"npx @angular/cli@latest new {{name}}","docsUrl":"https://angular.dev/","category":"frontend"},
  {"id":"vite-preact","name":"Vite + Preact","description":"Tiny React-compatible SPA.","stack":["Preact","TypeScript","Vite"],"tags":["spa","lightweight"],"command":"npm create vite@latest {{name}} -- --template preact-ts","docsUrl":"https://preactjs.com/","category":"frontend"},
  {"id":"vite-lit","name":"Vite + Lit","description":"Web components with Lit and TypeScript.","stack":["Lit","TypeScript","Vite"],"tags":["web-components"],"command":"npm create vite@latest {{name}} -- --template lit-ts","docsUrl":"https://lit.dev/docs/","category":"frontend"},
  {"id":"vite-vanilla","name":"Vite + Vanilla TS","description":"No framework, just TypeScript and Vite.","stack":["TypeScript","Vite"],"tags":["spa","minimal"],"command":"npm create vite@latest {{name}} -- --template vanilla-ts","docsUrl":"https://vite.dev/guide/","category":"frontend"},
  {"id":"hono","name":"Hono","description":"Ultrafast web framework that runs on any JS runtime.","stack":["TypeScript","Hono"],"tags":["api","edge","backend"],"command":"npm create hono@latest {{name}}","docsUrl":"https://hono.dev/docs/","category":"node-backend"},
  {"id":"elysia","name":"Elysia","description":"Ergonomic Bun web framework with end-to-end type safety.","stack":["TypeScript","Bun","Elysia"],"tags":["api","backend"],"command":"bun create elysia {{name}}","docsUrl":"https://elysiajs.com/","category":"node-backend"},
  {"id":"express","name":"Express","description":"The classic minimal Node web framework.","stack":["Node.js","Express"],"tags":["api","backend"],"command":"npx express-generator {{name}}","docsUrl":"https://expressjs.com/","category":"node-backend"},
  {"id":"fastify","name":"Fastify","description":"Fast, low-overhead Node framework with schema validation.","stack":["Node.js","TypeScript","Fastify"],"tags":["api","backend"],"command":"npm create fastify@latest {{name}}","docsUrl":"https://fastify.dev/docs/latest/","category":"node-backend"},
  {"id":"nestjs","name":"NestJS","description":"Opinionated TypeScript backend framework with DI.","stack":["TypeScript","NestJS"],"tags":["api","backend","enterprise"],"command":"npx @nestjs/cli@latest new {{name}}","docsUrl":"https://docs.nestjs.com/","category":"node-backend"},
  {"id":"trpc-next","name":"tRPC + Next.js","description":"End-to-end typesafe APIs with Prisma and Next.js.","stack":["TypeScript","tRPC","Next.js","Prisma"],"tags":["api","typesafe","fullstack"],"command":"npx degit trpc/examples-next-prisma-starter {{name}}","docsUrl":"https://trpc.io/docs","category":"node-backend"},
  {"id":"encore-ts","name":"Encore.ts","description":"TypeScript backend framework with built-in infrastructure.","stack":["TypeScript","Encore"],"tags":["api","backend","cloud"],"command":"npx encore.dev@latest app create {{name}}","docsUrl":"https://encore.dev/docs","category":"node-backend"},
  {"id":"fastapi","name":"FastAPI","description":"Async Python API framework with automatic OpenAPI docs.","stack":["Python","FastAPI"],"tags":["api","backend"],"command":"npx degit fastapi/full-stack-fastapi-template {{name}}","docsUrl":"https://fastapi.tiangolo.com/","category":"python"},
  {"id":"fastapi-uv","name":"FastAPI (uv)","description":"Minimal FastAPI project managed with uv.","stack":["Python","FastAPI","uv"],"tags":["api","backend","minimal"],"command":"uv init {{name}} && cd {{name}} && uv add fastapi --extra standard","docsUrl":"https://fastapi.tiangolo.com/","category":"python"},
  {"id":"django","name":"Django","description":"Batteries-included Python web framework with an admin.","stack":["Python","Django"],"tags":["fullstack","backend","admin"],"command":"uvx --from django django-admin startproject {{name}}","docsUrl":"https://docs.djangoproject.com/","category":"python"},
  {"id":"flask","name":"Flask","description":"Small, flexible Python web framework.","stack":["Python","Flask"],"tags":["api","backend","minimal"],"command":"uv init {{name}} && cd {{name}} && uv add flask","docsUrl":"https://flask.palletsprojects.com/","category":"python"},
  {"id":"python-package","name":"Python package","description":"Library scaffold with pyproject and uv workflows.","stack":["Python","uv"],"tags":["package","library"],"command":"uv init --lib {{name}}","docsUrl":"https://docs.astral.sh/uv/","category":"python"},
  {"id":"streamlit","name":"Streamlit","description":"Data apps and dashboards in pure Python.","stack":["Python","Streamlit"],"tags":["data","dashboard"],"command":"uv init {{name}} && cd {{name}} && uv add streamlit","docsUrl":"https://docs.streamlit.io/","category":"python"},
  {"id":"gradio","name":"Gradio","description":"Quick web UIs for machine learning models.","stack":["Python","Gradio"],"tags":["ai","data","ui"],"command":"uv init {{name}} && cd {{name}} && uv add gradio","docsUrl":"https://www.gradio.app/docs","category":"python"},
  {"id":"jupyter-ds","name":"Data science notebook","description":"Notebook project with pandas, numpy and matplotlib.","stack":["Python","Jupyter"],"tags":["data","notebook"],"command":"uv init {{name}} && cd {{name}} && uv add jupyter pandas numpy matplotlib","docsUrl":"https://jupyter.org/","category":"python"},
  {"id":"axum","name":"Axum","description":"Ergonomic async Rust web framework built on Tokio.","stack":["Rust","Axum","Tokio"],"tags":["api","backend"],"command":"cargo new {{name}} && cd {{name}} && cargo add axum tokio --features tokio/full","docsUrl":"https://docs.rs/axum/","category":"rust"},
  {"id":"actix","name":"Actix Web","description":"High-performance Rust web framework.","stack":["Rust","Actix"],"tags":["api","backend"],"command":"cargo new {{name}} && cd {{name}} && cargo add actix-web","docsUrl":"https://actix.rs/docs/","category":"rust"},
  {"id":"rocket","name":"Rocket","description":"Rust web framework focused on usability and type safety.","stack":["Rust","Rocket"],"tags":["api","backend"],"command":"cargo new {{name}} && cd {{name}} && cargo add rocket","docsUrl":"https://rocket.rs/guide/","category":"rust"},
  {"id":"clap-cli","name":"Rust CLI (clap)","description":"Command line tool with derive-based argument parsing.","stack":["Rust","clap"],"tags":["cli"],"command":"cargo new {{name}} && cd {{name}} && cargo add clap --features derive","docsUrl":"https://docs.rs/clap/","category":"rust"},
  {"id":"rust-lib","name":"Rust library","description":"Library crate with the standard cargo layout.","stack":["Rust"],"tags":["library","package"],"command":"cargo new --lib {{name}}","docsUrl":"https://doc.rust-lang.org/cargo/","category":"rust"},
  {"id":"bevy","name":"Bevy","description":"Data-driven Rust game engine with an ECS.","stack":["Rust","Bevy"],"tags":["game","graphics"],"command":"cargo new {{name}} && cd {{name}} && cargo add bevy","docsUrl":"https://bevyengine.org/learn/","category":"rust"},
  {"id":"leptos","name":"Leptos","description":"Full-stack reactive Rust web framework compiled to WASM.","stack":["Rust","Leptos","WASM"],"tags":["fullstack","wasm"],"command":"npx degit leptos-rs/start-axum {{name}}","docsUrl":"https://leptos.dev/","category":"rust"},
  {"id":"go-module","name":"Go module","description":"Plain Go module with a main package.","stack":["Go"],"tags":["backend","minimal"],"command":"mkdir {{name}} && cd {{name}} && go mod init {{name}}","docsUrl":"https://go.dev/doc/tutorial/","category":"go"},
  {"id":"go-chi","name":"Go + chi","description":"Lightweight idiomatic HTTP router for Go services.","stack":["Go","chi"],"tags":["api","backend"],"command":"mkdir {{name}} && cd {{name}} && go mod init {{name}} && go get github.com/go-chi/chi/v5","docsUrl":"https://go-chi.io/","category":"go"},
  {"id":"go-gin","name":"Go + Gin","description":"Fast Go web framework with a martini-like API.","stack":["Go","Gin"],"tags":["api","backend"],"command":"mkdir {{name}} && cd {{name}} && go mod init {{name}} && go get github.com/gin-gonic/gin","docsUrl":"https://gin-gonic.com/docs/","category":"go"},
  {"id":"go-fiber","name":"Go + Fiber","description":"Express-inspired Go web framework built on fasthttp.","stack":["Go","Fiber"],"tags":["api","backend"],"command":"mkdir {{name}} && cd {{name}} && go mod init {{name}} && go get github.com/gofiber/fiber/v2","docsUrl":"https://docs.gofiber.io/","category":"go"},
  {"id":"go-echo","name":"Go + Echo","description":"Minimalist high-performance Go web framework.","stack":["Go","Echo"],"tags":["api","backend"],"command":"mkdir {{name}} && cd {{name}} && go mod init {{name}} && go get github.com/labstack/echo/v4","docsUrl":"https://echo.labstack.com/docs","category":"go"},
  {"id":"go-cobra","name":"Go CLI (Cobra)","description":"Command line application with subcommands and flags.","stack":["Go","Cobra"],"tags":["cli"],"command":"mkdir {{name}} && cd {{name}} && go mod init {{name}} && go get github.com/spf13/cobra","docsUrl":"https://cobra.dev/","category":"go"},
  {"id":"go-templ-htmx","name":"Go + templ + HTMX","description":"Server-rendered Go app with typed templates and HTMX.","stack":["Go","templ","HTMX"],"tags":["fullstack","hypermedia"],"command":"mkdir {{name}} && cd {{name}} && go mod init {{name}} && go get github.com/a-h/templ","docsUrl":"https://templ.guide/","category":"go"},
  {"id":"rails","name":"Rails","description":"Full-stack Ruby framework with conventions and an ORM.","stack":["Ruby","Rails"],"tags":["fullstack","backend"],"command":"gem install rails && rails new {{name}}","docsUrl":"https://guides.rubyonrails.org/","category":"ruby"},
  {"id":"rails-api","name":"Rails API-only","description":"Rails without views, for JSON APIs.","stack":["Ruby","Rails"],"tags":["api","backend"],"command":"gem install rails && rails new {{name}} --api","docsUrl":"https://guides.rubyonrails.org/api_app.html","category":"ruby"},
  {"id":"rails-tailwind","name":"Rails + Tailwind","description":"Rails with Tailwind CSS and Hotwire preconfigured.","stack":["Ruby","Rails","Tailwind"],"tags":["fullstack","styling"],"command":"gem install rails && rails new {{name}} --css tailwind","docsUrl":"https://guides.rubyonrails.org/","category":"ruby"},
  {"id":"sinatra","name":"Sinatra","description":"Tiny Ruby DSL for small web services.","stack":["Ruby","Sinatra"],"tags":["api","minimal"],"command":"mkdir {{name}} && cd {{name}} && bundle init && bundle add sinatra","docsUrl":"https://sinatrarb.com/","category":"ruby"},
  {"id":"laravel","name":"Laravel","description":"PHP framework with Eloquent, queues and a rich ecosystem.","stack":["PHP","Laravel"],"tags":["fullstack","backend"],"command":"composer create-project laravel/laravel {{name}}","docsUrl":"https://laravel.com/docs","category":"php"},
  {"id":"laravel-react","name":"Laravel + React","description":"Laravel with Inertia and a React frontend.","stack":["PHP","Laravel","React","Inertia"],"tags":["fullstack","react"],"command":"laravel new {{name}} --react","docsUrl":"https://laravel.com/docs/starter-kits","category":"php"},
  {"id":"laravel-vue","name":"Laravel + Vue","description":"Laravel with Inertia and a Vue frontend.","stack":["PHP","Laravel","Vue","Inertia"],"tags":["fullstack","vue"],"command":"laravel new {{name}} --vue","docsUrl":"https://laravel.com/docs/starter-kits","category":"php"},
  {"id":"laravel-livewire","name":"Laravel + Livewire","description":"Server-driven reactive UI without writing JavaScript.","stack":["PHP","Laravel","Livewire"],"tags":["fullstack","hypermedia"],"command":"laravel new {{name}} --livewire","docsUrl":"https://livewire.laravel.com/","category":"php"},
  {"id":"symfony","name":"Symfony","description":"Modular PHP framework used for large applications.","stack":["PHP","Symfony"],"tags":["fullstack","enterprise"],"command":"composer create-project symfony/skeleton {{name}}","docsUrl":"https://symfony.com/doc/current/index.html","category":"php"},
  {"id":"wordpress-plugin","name":"WordPress plugin","description":"Scaffold for a WordPress plugin with a build step.","stack":["PHP","WordPress"],"tags":["plugin","cms"],"command":"npx @wordpress/create-block@latest {{name}}","docsUrl":"https://developer.wordpress.org/block-editor/","category":"php"},
  {"id":"phoenix","name":"Phoenix","description":"Elixir web framework with LiveView and channels.","stack":["Elixir","Phoenix"],"tags":["fullstack","realtime"],"command":"mix archive.install hex phx_new && mix phx.new {{name}}","docsUrl":"https://hexdocs.pm/phoenix/","category":"elixir"},
  {"id":"phoenix-liveview","name":"Phoenix LiveView","description":"Realtime server-rendered UI over websockets.","stack":["Elixir","Phoenix","LiveView"],"tags":["realtime","fullstack"],"command":"mix archive.install hex phx_new && mix phx.new {{name}} --live","docsUrl":"https://hexdocs.pm/phoenix_live_view/","category":"elixir"},
  {"id":"tauri-react","name":"Tauri + React","description":"Native desktop app with a Rust core and React UI.","stack":["Rust","React","TypeScript","Tauri"],"tags":["desktop","native"],"command":"npm create tauri-app@latest {{name}} -- --template react-ts","docsUrl":"https://tauri.app/start/","category":"desktop"},
  {"id":"tauri-vue","name":"Tauri + Vue","description":"Native desktop app with a Vue frontend.","stack":["Rust","Vue","TypeScript","Tauri"],"tags":["desktop","native"],"command":"npm create tauri-app@latest {{name}} -- --template vue-ts","docsUrl":"https://tauri.app/start/","category":"desktop"},
  {"id":"tauri-svelte","name":"Tauri + Svelte","description":"Native desktop app with a Svelte frontend.","stack":["Rust","Svelte","TypeScript","Tauri"],"tags":["desktop","native"],"command":"npm create tauri-app@latest {{name}} -- --template svelte-ts","docsUrl":"https://tauri.app/start/","category":"desktop"},
  {"id":"tauri-vanilla","name":"Tauri + Vanilla","description":"Native desktop shell with plain HTML and TypeScript.","stack":["Rust","TypeScript","Tauri"],"tags":["desktop","native","minimal"],"command":"npm create tauri-app@latest {{name}} -- --template vanilla-ts","docsUrl":"https://tauri.app/start/","category":"desktop"},
  {"id":"electron-forge","name":"Electron Forge","description":"Cross-platform desktop app with packaging built in.","stack":["Electron","TypeScript"],"tags":["desktop"],"command":"npm init electron-app@latest {{name}} -- --template=vite-typescript","docsUrl":"https://www.electronforge.io/","category":"desktop"},
  {"id":"expo-router","name":"Expo Router","description":"React Native app with file-based navigation.","stack":["React Native","TypeScript","Expo"],"tags":["mobile","ios","android"],"command":"npx create-expo-app@latest {{name}}","docsUrl":"https://docs.expo.dev/router/introduction/","category":"mobile"},
  {"id":"expo-blank","name":"Expo blank","description":"Bare Expo app with no navigation preinstalled.","stack":["React Native","TypeScript","Expo"],"tags":["mobile","minimal"],"command":"npx create-expo-app@latest {{name}} --template blank-typescript","docsUrl":"https://docs.expo.dev/","category":"mobile"},
  {"id":"react-native","name":"React Native","description":"Bare React Native project without Expo.","stack":["React Native","TypeScript"],"tags":["mobile","ios","android"],"command":"npx @react-native-community/cli@latest init {{name}}","docsUrl":"https://reactnative.dev/docs/environment-setup","category":"mobile"},
  {"id":"flutter","name":"Flutter","description":"Cross-platform app framework from Google.","stack":["Dart","Flutter"],"tags":["mobile","ios","android","desktop"],"command":"flutter create {{name}}","docsUrl":"https://docs.flutter.dev/","category":"mobile"},
  {"id":"chrome-mv3-plasmo","name":"Chrome extension (Plasmo)","description":"Manifest V3 extension with React and hot reload.","stack":["TypeScript","React","Plasmo"],"tags":["extension","chrome"],"command":"npm create plasmo@latest {{name}}","docsUrl":"https://docs.plasmo.com/","category":"extension"},
  {"id":"chrome-mv3-wxt","name":"Chrome extension (WXT)","description":"Cross-browser extension framework with Vite tooling.","stack":["TypeScript","WXT"],"tags":["extension","chrome","firefox"],"command":"npx wxt@latest init {{name}}","docsUrl":"https://wxt.dev/","category":"extension"},
  {"id":"raycast-extension","name":"Raycast extension","description":"Raycast command extension in React.","stack":["TypeScript","React","Raycast"],"tags":["extension","macos","productivity"],"command":"npm init raycast-extension@latest {{name}}","docsUrl":"https://developers.raycast.com/","category":"extension"},
  {"id":"vscode-extension","name":"VS Code extension","description":"Editor extension scaffold with the official generator.","stack":["TypeScript","VS Code"],"tags":["extension","editor"],"command":"npx --package yo --package generator-code -- yo code {{name}}","docsUrl":"https://code.visualstudio.com/api","category":"extension"},
  {"id":"obsidian-plugin","name":"Obsidian plugin","description":"Plugin scaffold for the Obsidian note app.","stack":["TypeScript","Obsidian"],"tags":["plugin","notes"],"command":"npx degit obsidianmd/obsidian-sample-plugin {{name}}","docsUrl":"https://docs.obsidian.md/","category":"extension"},
  {"id":"figma-plugin","name":"Figma plugin","description":"Figma plugin with a TypeScript build setup.","stack":["TypeScript","Figma"],"tags":["plugin","design"],"command":"npx degit figma/plugin-samples/typescript {{name}}","docsUrl":"https://www.figma.com/plugin-docs/","category":"extension"},
  {"id":"oclif-cli","name":"oclif CLI","description":"Rich Node CLI framework used by Salesforce and Heroku.","stack":["TypeScript","oclif"],"tags":["cli"],"command":"npx oclif generate {{name}}","docsUrl":"https://oclif.io/docs/introduction","category":"cli"},
  {"id":"commander-cli","name":"Node CLI (Commander)","description":"Minimal Node command line tool.","stack":["Node.js","TypeScript"],"tags":["cli","minimal"],"command":"npm init -y && npm install commander","docsUrl":"https://github.com/tj/commander.js","category":"cli"},
  {"id":"bun-cli","name":"Bun CLI","description":"Single-file CLI running on the Bun runtime.","stack":["TypeScript","Bun"],"tags":["cli","fast"],"command":"bun init {{name}}","docsUrl":"https://bun.sh/docs","category":"cli"},
  {"id":"npm-package","name":"npm package (TS)","description":"Publishable TypeScript library with build tooling.","stack":["TypeScript"],"tags":["library","package"],"command":"npm create tsdown@latest {{name}}","docsUrl":"https://www.npmjs.com/","category":"package"},
  {"id":"deno-project","name":"Deno project","description":"Deno app with built-in TypeScript and permissions.","stack":["TypeScript","Deno"],"tags":["backend","cli"],"command":"deno init {{name}}","docsUrl":"https://docs.deno.com/","category":"package"},
  {"id":"docusaurus","name":"Docusaurus","description":"Documentation site with versioning and MDX.","stack":["React","TypeScript","Docusaurus"],"tags":["docs","content"],"command":"npx create-docusaurus@latest {{name}} classic --typescript","docsUrl":"https://docusaurus.io/docs","category":"docs"},
  {"id":"vitepress","name":"VitePress","description":"Fast Vue-powered documentation site generator.","stack":["Vue","TypeScript","VitePress"],"tags":["docs","content"],"command":"npx vitepress@latest init","docsUrl":"https://vitepress.dev/","category":"docs"},
  {"id":"hugo","name":"Hugo","description":"Extremely fast static site generator written in Go.","stack":["Go","Hugo"],"tags":["static","blog","content"],"command":"hugo new site {{name}}","docsUrl":"https://gohugo.io/documentation/","category":"docs"},
  {"id":"eleventy","name":"Eleventy","description":"Simpler static site generator with flexible templating.","stack":["JavaScript","Eleventy"],"tags":["static","blog"],"command":"mkdir {{name}} && cd {{name}} && npm init -y && npm install @11ty/eleventy","docsUrl":"https://www.11ty.dev/docs/","category":"docs"},
  {"id":"static-html","name":"Static site","description":"Plain HTML, CSS and JavaScript with no build step.","stack":["HTML","CSS","JavaScript"],"tags":["static","minimal"],"command":"mkdir {{name}} && cd {{name}} && printf '<!doctype html>\\n<title>{{name}}</title>\\n' > index.html","docsUrl":"https://developer.mozilla.org/","category":"docs"},
  {"id":"vercel-ai-sdk","name":"Vercel AI SDK","description":"Next.js chat app built on the Vercel AI SDK.","stack":["TypeScript","Next.js","AI SDK"],"tags":["ai","chat","streaming"],"command":"npx create-next-app@latest {{name}} --example https://github.com/vercel/ai/tree/main/examples/next-openai","docsUrl":"https://sdk.vercel.ai/docs","category":"ai"},
  {"id":"anthropic-sdk","name":"Anthropic SDK","description":"TypeScript project wired to the Claude API.","stack":["TypeScript","Anthropic"],"tags":["ai","api"],"command":"mkdir {{name}} && cd {{name}} && npm init -y && npm install @anthropic-ai/sdk","docsUrl":"https://docs.claude.com/en/api/","category":"ai"},
  {"id":"mcp-server","name":"MCP server","description":"Model Context Protocol server exposing tools to agents.","stack":["TypeScript","MCP"],"tags":["ai","agents","tools"],"command":"npx create-mcp-server@latest {{name}}","docsUrl":"https://modelcontextprotocol.io/","category":"ai"},
  {"id":"langchain-js","name":"LangChain (JS)","description":"Chains and agents in TypeScript.","stack":["TypeScript","LangChain"],"tags":["ai","agents"],"command":"mkdir {{name}} && cd {{name}} && npm init -y && npm install langchain @langchain/core","docsUrl":"https://js.langchain.com/docs/","category":"ai"},
  {"id":"langchain-py","name":"LangChain (Python)","description":"Chains and agents in Python, managed with uv.","stack":["Python","LangChain","uv"],"tags":["ai","agents"],"command":"uv init {{name}} && cd {{name}} && uv add langchain langchain-core","docsUrl":"https://python.langchain.com/docs/","category":"ai"},
  {"id":"llamaindex","name":"LlamaIndex","description":"RAG pipelines over your own documents.","stack":["Python","LlamaIndex","uv"],"tags":["ai","rag","data"],"command":"uv init {{name}} && cd {{name}} && uv add llama-index","docsUrl":"https://docs.llamaindex.ai/","category":"ai"},
  {"id":"openai-agents","name":"OpenAI Agents SDK","description":"Multi-agent workflows with the OpenAI Agents SDK.","stack":["Python","OpenAI","uv"],"tags":["ai","agents"],"command":"uv init {{name}} && cd {{name}} && uv add openai-agents","docsUrl":"https://openai.github.io/openai-agents-python/","category":"ai"},
  {"id":"supabase-next","name":"Supabase + Next.js","description":"Next.js app with Supabase auth and Postgres.","stack":["TypeScript","Next.js","Supabase"],"tags":["fullstack","auth","database"],"command":"npx create-next-app@latest {{name}} -e with-supabase","docsUrl":"https://supabase.com/docs","category":"data"},
  {"id":"prisma-ts","name":"Prisma + TypeScript","description":"TypeScript project with Prisma ORM configured.","stack":["TypeScript","Prisma"],"tags":["database","orm"],"command":"mkdir {{name}} && cd {{name}} && npm init -y && npm install prisma --save-dev && npx prisma init","docsUrl":"https://www.prisma.io/docs","category":"data"},
  {"id":"drizzle-ts","name":"Drizzle + TypeScript","description":"Lightweight TypeScript ORM with SQL-like syntax.","stack":["TypeScript","Drizzle"],"tags":["database","orm"],"command":"mkdir {{name}} && cd {{name}} && npm init -y && npm install drizzle-orm && npm install -D drizzle-kit","docsUrl":"https://orm.drizzle.team/docs","category":"data"},
  {"id":"convex","name":"Convex","description":"Reactive backend with a TypeScript database and functions.","stack":["TypeScript","Convex"],"tags":["backend","realtime","database"],"command":"npm create convex@latest {{name}}","docsUrl":"https://docs.convex.dev/","category":"data"},
  {"id":"turborepo","name":"Turborepo","description":"High-performance monorepo with shared packages.","stack":["TypeScript","Turborepo"],"tags":["monorepo","tooling"],"command":"npx create-turbo@latest {{name}}","docsUrl":"https://turborepo.com/docs","category":"monorepo"},
  {"id":"nx-monorepo","name":"Nx monorepo","description":"Monorepo with generators, caching and task graphs.","stack":["TypeScript","Nx"],"tags":["monorepo","tooling"],"command":"npx create-nx-workspace@latest {{name}}","docsUrl":"https://nx.dev/getting-started","category":"monorepo"},
  {"id":"pnpm-workspace","name":"pnpm workspace","description":"Minimal monorepo using pnpm workspaces.","stack":["TypeScript","pnpm"],"tags":["monorepo","minimal"],"command":"mkdir {{name}} && cd {{name}} && pnpm init && printf 'packages:\\n  - packages/*\\n' > pnpm-workspace.yaml","docsUrl":"https://pnpm.io/workspaces","category":"monorepo"},
  {"id":"storybook","name":"Storybook","description":"Component workshop and visual documentation.","stack":["TypeScript","Storybook"],"tags":["ui","testing","docs"],"command":"npx storybook@latest init","docsUrl":"https://storybook.js.org/docs","category":"tooling"},
  {"id":"playwright","name":"Playwright","description":"End-to-end browser testing across Chromium, Firefox and WebKit.","stack":["TypeScript","Playwright"],"tags":["testing","e2e"],"command":"npm init playwright@latest {{name}}","docsUrl":"https://playwright.dev/docs/intro","category":"tooling"},
  {"id":"vitest-lib","name":"Vitest library","description":"TypeScript library with Vitest configured.","stack":["TypeScript","Vitest"],"tags":["testing","library"],"command":"mkdir {{name}} && cd {{name}} && npm init -y && npm install -D vitest typescript","docsUrl":"https://vitest.dev/guide/","category":"tooling"},
  {"id":"discord-bot","name":"Discord bot","description":"Discord.js bot with slash command support.","stack":["TypeScript","Discord.js"],"tags":["bot","chat"],"command":"mkdir {{name}} && cd {{name}} && npm init -y && npm install discord.js","docsUrl":"https://discordjs.guide/","category":"bot"},
  {"id":"telegram-bot","name":"Telegram bot","description":"Telegram bot built with grammY.","stack":["TypeScript","grammY"],"tags":["bot","chat"],"command":"mkdir {{name}} && cd {{name}} && npm init -y && npm install grammy","docsUrl":"https://grammy.dev/","category":"bot"},
  {"id":"godot-project","name":"Godot project","description":"Open-source game engine project folder.","stack":["Godot","GDScript"],"tags":["game"],"command":"mkdir {{name}} && cd {{name}} && printf '[application]\\nconfig/name=\"{{name}}\"\\n' > project.godot","docsUrl":"https://docs.godotengine.org/","category":"game"},
  {"id":"phaser-game","name":"Phaser game","description":"2D browser game with Phaser and Vite.","stack":["TypeScript","Phaser","Vite"],"tags":["game","web"],"command":"npm create @phaserjs/game@latest {{name}}","docsUrl":"https://phaser.io/learn","category":"game"},
  {"id":"threejs-scene","name":"Three.js scene","description":"3D scene scaffold with Three.js and Vite.","stack":["TypeScript","Three.js","Vite"],"tags":["3d","graphics","web"],"command":"npm create vite@latest {{name}} -- --template vanilla-ts && cd {{name}} && npm install three","docsUrl":"https://threejs.org/docs/","category":"game"}
]"#;

fn starters_path() -> PathBuf {
    dirs::home_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join(".workbench")
        .join("starters.json")
}

fn default_registry() -> Vec<StarterTemplate> {
    serde_json::from_str(DEFAULT_STARTERS_JSON).unwrap_or_default()
}

pub fn merge_defaults(
    existing: Vec<StarterTemplate>,
    defaults: Vec<StarterTemplate>,
) -> (Vec<StarterTemplate>, usize) {
    let known: std::collections::HashSet<String> =
        existing.iter().map(|t| t.id.clone()).collect();
    let mut merged = existing;
    let mut added = 0;
    for template in defaults {
        if !known.contains(&template.id) {
            merged.push(template);
            added += 1;
        }
    }
    (merged, added)
}

fn load_registry() -> Result<Vec<StarterTemplate>, String> {
    let path = starters_path();
    if !path.exists() {
        let defaults = default_registry();
        save_registry(&defaults)?;
        return Ok(defaults);
    }
    let raw = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let existing: Vec<StarterTemplate> =
        serde_json::from_str(&raw).map_err(|e| e.to_string())?;

    let (merged, added) = merge_defaults(existing, default_registry());
    if added > 0 {
        save_registry(&merged)?;
    }
    Ok(merged)
}

fn save_registry(templates: &[StarterTemplate]) -> Result<(), String> {
    let path = starters_path();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let raw = serde_json::to_string_pretty(templates).map_err(|e| e.to_string())?;
    fs::write(&path, raw).map_err(|e| e.to_string())
}

pub fn list_starters() -> Result<Vec<StarterTemplate>, String> {
    load_registry()
}

pub fn save_starter(template: StarterTemplate) -> Result<StarterTemplate, String> {
    let mut registry = load_registry()?;
    if let Some(existing) = registry.iter_mut().find(|t| t.id == template.id) {
        *existing = template.clone();
    } else {
        registry.push(template.clone());
    }
    save_registry(&registry)?;
    Ok(template)
}

pub fn delete_starter(id: &str) -> Result<(), String> {
    let mut registry = load_registry()?;
    registry.retain(|t| t.id != id);
    save_registry(&registry)
}

fn shell_quote(value: &str) -> String {
    format!("'{}'", value.replace('\'', "'\\''"))
}

pub fn save_folder_as_starter(
    path: &str,
    name: &str,
    roots: &[PathBuf],
) -> Result<StarterTemplate, String> {
    let resolved = guard_existing(path, roots)?;
    if !resolved.is_dir() {
        return Err(format!("{path} is not a directory"));
    }
    let id = slugify(name);
    let template = StarterTemplate {
        id,
        name: name.to_string(),
        description: format!("Local template copied from {}", resolved.display()),
        stack: Vec::new(),
        tags: vec!["local".to_string()],
        command: format!("cp -R {} ./{{{{name}}}}", shell_quote(&resolved.to_string_lossy())),
        docs_url: String::new(),
        category: "local".to_string(),
    };
    save_starter(template)
}

fn slugify(name: &str) -> String {
    let mut slug = String::new();
    let mut last_dash = false;
    for ch in name.to_lowercase().chars() {
        if ch.is_ascii_alphanumeric() {
            slug.push(ch);
            last_dash = false;
        } else if !last_dash {
            slug.push('-');
            last_dash = true;
        }
    }
    slug.trim_matches('-').to_string()
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileTemplate {
    pub id: String,
    pub kind: String,
    pub label: String,
    pub file_name: String,
}

struct TemplateDef {
    id: &'static str,
    framework: &'static str,
    kind: &'static str,
    label: &'static str,
    file_name_pattern: &'static str,
    body: &'static str,
}

const CATALOG: &[TemplateDef] = &[
    TemplateDef {
        id: "react-component",
        framework: "react",
        kind: "component",
        label: "Component",
        file_name_pattern: "{{PascalName}}.tsx",
        body: "import { type FC } from \"react\";\n\ninterface {{PascalName}}Props {}\n\nexport const {{PascalName}}: FC<{{PascalName}}Props> = () => {\n  return <div />;\n};\n",
    },
    TemplateDef {
        id: "react-hook",
        framework: "react",
        kind: "hook",
        label: "Hook",
        file_name_pattern: "use{{PascalName}}.ts",
        body: "import { useState } from \"react\";\n\nexport function use{{PascalName}}() {\n  const [state, setState] = useState(null);\n  return { state, setState };\n}\n",
    },
    TemplateDef {
        id: "react-store",
        framework: "react",
        kind: "store",
        label: "Context store",
        file_name_pattern: "{{PascalName}}Context.tsx",
        body: "import { createContext, useContext, type ReactNode } from \"react\";\n\ninterface {{PascalName}}ContextValue {}\n\nconst {{PascalName}}Context = createContext<{{PascalName}}ContextValue | null>(null);\n\nexport function {{PascalName}}Provider({ children }: { children: ReactNode }) {\n  const value: {{PascalName}}ContextValue = {};\n  return (\n    <{{PascalName}}Context.Provider value={value}>{children}</{{PascalName}}Context.Provider>\n  );\n}\n\nexport function use{{PascalName}}() {\n  const ctx = useContext({{PascalName}}Context);\n  if (!ctx) throw new Error(\"use{{PascalName}} must be used within {{PascalName}}Provider\");\n  return ctx;\n}\n",
    },
    TemplateDef {
        id: "react-test",
        framework: "react",
        kind: "test",
        label: "Test",
        file_name_pattern: "{{PascalName}}.test.ts",
        body: "import { describe, expect, it } from \"vitest\";\n\ndescribe(\"{{PascalName}}\", () => {\n  it(\"works\", () => {\n    expect(true).toBe(true);\n  });\n});\n",
    },
    TemplateDef {
        id: "nextjs-route",
        framework: "nextjs",
        kind: "route",
        label: "App router page",
        file_name_pattern: "{{kebab-name}}/page.tsx",
        body: "export default function {{PascalName}}Page() {\n  return <div>{{PascalName}}</div>;\n}\n",
    },
    TemplateDef {
        id: "nextjs-api",
        framework: "nextjs",
        kind: "api",
        label: "API handler",
        file_name_pattern: "{{kebab-name}}/route.ts",
        body: "import { NextResponse } from \"next/server\";\n\nexport async function GET() {\n  return NextResponse.json({ ok: true });\n}\n",
    },
    TemplateDef {
        id: "nextjs-component",
        framework: "nextjs",
        kind: "component",
        label: "Component",
        file_name_pattern: "{{PascalName}}.tsx",
        body: "import { type FC } from \"react\";\n\ninterface {{PascalName}}Props {}\n\nexport const {{PascalName}}: FC<{{PascalName}}Props> = () => {\n  return <div />;\n};\n",
    },
    TemplateDef {
        id: "nextjs-test",
        framework: "nextjs",
        kind: "test",
        label: "Test",
        file_name_pattern: "{{PascalName}}.test.ts",
        body: "import { describe, expect, it } from \"vitest\";\n\ndescribe(\"{{PascalName}}\", () => {\n  it(\"works\", () => {\n    expect(true).toBe(true);\n  });\n});\n",
    },
    TemplateDef {
        id: "vue-component",
        framework: "vue",
        kind: "component",
        label: "Component",
        file_name_pattern: "{{PascalName}}.vue",
        body: "<script setup lang=\"ts\">\ninterface Props {}\n\ndefineProps<Props>();\n</script>\n\n<template>\n  <div></div>\n</template>\n",
    },
    TemplateDef {
        id: "vue-test",
        framework: "vue",
        kind: "test",
        label: "Test",
        file_name_pattern: "{{PascalName}}.test.ts",
        body: "import { describe, expect, it } from \"vitest\";\nimport { mount } from \"@vue/test-utils\";\nimport {{PascalName}} from \"./{{PascalName}}.vue\";\n\ndescribe(\"{{PascalName}}\", () => {\n  it(\"renders\", () => {\n    const wrapper = mount({{PascalName}});\n    expect(wrapper.exists()).toBe(true);\n  });\n});\n",
    },
    TemplateDef {
        id: "svelte-component",
        framework: "svelte",
        kind: "component",
        label: "Component",
        file_name_pattern: "{{PascalName}}.svelte",
        body: "<script lang=\"ts\">\n  export let name = \"{{PascalName}}\";\n</script>\n\n<div>{name}</div>\n",
    },
    TemplateDef {
        id: "svelte-test",
        framework: "svelte",
        kind: "test",
        label: "Test",
        file_name_pattern: "{{PascalName}}.test.ts",
        body: "import { describe, expect, it } from \"vitest\";\nimport { render } from \"@testing-library/svelte\";\nimport {{PascalName}} from \"./{{PascalName}}.svelte\";\n\ndescribe(\"{{PascalName}}\", () => {\n  it(\"renders\", () => {\n    const { container } = render({{PascalName}});\n    expect(container).toBeTruthy();\n  });\n});\n",
    },
    TemplateDef {
        id: "rails-route",
        framework: "rails",
        kind: "route",
        label: "Controller",
        file_name_pattern: "{{snake_name}}_controller.rb",
        body: "class {{PascalName}}Controller < ApplicationController\n  def index\n    render json: {}\n  end\nend\n",
    },
    TemplateDef {
        id: "rails-test",
        framework: "rails",
        kind: "test",
        label: "Controller test",
        file_name_pattern: "{{snake_name}}_controller_test.rb",
        body: "require \"test_helper\"\n\nclass {{PascalName}}ControllerTest < ActionDispatch::IntegrationTest\n  test \"should get index\" do\n    get {{snake_name}}_index_url\n    assert_response :success\n  end\nend\n",
    },
    TemplateDef {
        id: "go-api",
        framework: "go",
        kind: "api",
        label: "HTTP handler",
        file_name_pattern: "{{snake_name}}.go",
        body: "package handlers\n\nimport \"net/http\"\n\nfunc {{PascalName}}Handler(w http.ResponseWriter, r *http.Request) {\n\tw.WriteHeader(http.StatusOK)\n}\n",
    },
    TemplateDef {
        id: "go-test",
        framework: "go",
        kind: "test",
        label: "Handler test",
        file_name_pattern: "{{snake_name}}_test.go",
        body: "package handlers\n\nimport (\n\t\"net/http/httptest\"\n\t\"testing\"\n)\n\nfunc Test{{PascalName}}Handler(t *testing.T) {\n\tw := httptest.NewRecorder()\n\tr := httptest.NewRequest(\"GET\", \"/\", nil)\n\t{{PascalName}}Handler(w, r)\n\tif w.Code != 200 {\n\t\tt.Fatalf(\"expected 200, got %d\", w.Code)\n\t}\n}\n",
    },
    TemplateDef {
        id: "python-module",
        framework: "python",
        kind: "component",
        label: "Module",
        file_name_pattern: "{{snake_name}}.py",
        body: "class {{PascalName}}:\n    def __init__(self) -> None:\n        pass\n",
    },
    TemplateDef {
        id: "python-test",
        framework: "python",
        kind: "test",
        label: "Test",
        file_name_pattern: "test_{{snake_name}}.py",
        body: "from {{snake_name}} import {{PascalName}}\n\n\ndef test_{{snake_name}}_instantiates():\n    instance = {{PascalName}}()\n    assert instance is not None\n",
    },
];

fn split_words(name: &str) -> Vec<String> {
    let mut words = Vec::new();
    let mut current = String::new();
    for ch in name.chars() {
        if ch == '-' || ch == '_' || ch == ' ' {
            if !current.is_empty() {
                words.push(current.clone());
                current.clear();
            }
        } else if ch.is_uppercase() && !current.is_empty() {
            words.push(current.clone());
            current = ch.to_lowercase().to_string();
        } else {
            current.push(ch.to_ascii_lowercase());
        }
    }
    if !current.is_empty() {
        words.push(current);
    }
    words
}

fn pascal_case(name: &str) -> String {
    split_words(name)
        .iter()
        .map(|w| {
            let mut chars = w.chars();
            match chars.next() {
                Some(first) => first.to_uppercase().collect::<String>() + chars.as_str(),
                None => String::new(),
            }
        })
        .collect()
}

fn kebab_case(name: &str) -> String {
    split_words(name).join("-")
}

fn snake_case(name: &str) -> String {
    split_words(name).join("_")
}

fn substitute(template: &str, name: &str) -> String {
    template
        .replace("{{PascalName}}", &pascal_case(name))
        .replace("{{kebab-name}}", &kebab_case(name))
        .replace("{{snake_name}}", &snake_case(name))
}

pub fn file_templates(framework: &str) -> Vec<FileTemplate> {
    CATALOG
        .iter()
        .filter(|t| t.framework == framework)
        .map(|t| FileTemplate {
            id: t.id.to_string(),
            kind: t.kind.to_string(),
            label: t.label.to_string(),
            file_name: t.file_name_pattern.to_string(),
        })
        .collect()
}

pub fn create_from_template(
    dir: &str,
    template_id: &str,
    name: &str,
    roots: &[PathBuf],
) -> Result<String, String> {
    let def = CATALOG
        .iter()
        .find(|t| t.id == template_id)
        .ok_or_else(|| format!("unknown template {template_id}"))?;

    let resolved_dir = guard_existing(dir, roots)?;
    if !resolved_dir.is_dir() {
        return Err(format!("{dir} is not a directory"));
    }

    let relative_file_name = substitute(def.file_name_pattern, name);
    let target = resolved_dir.join(&relative_file_name);
    if let Some(parent) = target.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let contents = substitute(def.body, name);
    fs::write(&target, contents).map_err(|e| e.to_string())?;
    Ok(target.to_string_lossy().to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_registry_parses_and_has_unique_ids() {
        let registry = default_registry();
        assert!(registry.len() >= 30);
        let mut ids: Vec<&str> = registry.iter().map(|t| t.id.as_str()).collect();
        ids.sort();
        ids.dedup();
        assert_eq!(ids.len(), registry.len());
    }

    #[test]
    fn casing_helpers_match_conventions() {
        assert_eq!(pascal_case("user-profile"), "UserProfile");
        assert_eq!(kebab_case("UserProfile"), "user-profile");
        assert_eq!(snake_case("UserProfile"), "user_profile");
    }

    #[test]
    fn file_templates_filters_by_framework() {
        let templates = file_templates("react");
        assert!(templates.iter().any(|t| t.kind == "component"));
        assert!(templates.iter().all(|t| CATALOG
            .iter()
            .find(|c| c.id == t.id)
            .map(|c| c.framework == "react")
            .unwrap_or(false)));
    }

    #[test]
    fn registry_is_large_enough_to_cover_the_common_stacks() {
        let registry = default_registry();
        assert!(
            registry.len() >= 120,
            "expected a deep registry, found {}",
            registry.len()
        );
    }

    #[test]
    fn every_entry_has_the_fields_the_ui_renders() {
        for entry in default_registry() {
            assert!(!entry.name.trim().is_empty(), "{} has no name", entry.id);
            assert!(!entry.description.trim().is_empty(), "{} has no description", entry.id);
            assert!(!entry.command.trim().is_empty(), "{} has no command", entry.id);
            assert!(!entry.category.trim().is_empty(), "{} has no category", entry.id);
            assert!(!entry.stack.is_empty(), "{} has no stack", entry.id);
            assert!(
                entry.docs_url.starts_with("https://"),
                "{} has a non-https docs url",
                entry.id
            );
        }
    }

    #[test]
    fn no_command_contains_a_shell_injection_character() {
        for entry in default_registry() {
            for bad in ["`", "$(", "|", ";rm", "&&rm"] {
                assert!(
                    !entry.command.contains(bad),
                    "{} contains {bad} in its command",
                    entry.id
                );
            }
        }
    }

    #[test]
    fn commands_that_create_a_directory_use_the_name_placeholder() {
        let exempt = ["shadcn-dashboard", "shadcn-login", "shadcn-sidebar", "shadcn-vite", "storybook", "vitepress", "commander-cli"];
        for entry in default_registry() {
            if exempt.contains(&entry.id.as_str()) {
                continue;
            }
            assert!(
                entry.command.contains("{{name}}"),
                "{} never substitutes the project name",
                entry.id
            );
        }
    }

    #[test]
    fn categories_stay_a_tight_known_set() {
        let allowed = [
            "react", "nextjs", "ui", "vue", "svelte", "astro", "frontend", "node-backend",
            "python", "rust", "go", "ruby", "php", "elixir", "desktop", "mobile", "extension",
            "cli", "package", "docs", "ai", "data", "monorepo", "tooling", "bot", "game",
        ];
        for entry in default_registry() {
            assert!(
                allowed.contains(&entry.category.as_str()),
                "{} uses an unexpected category {}",
                entry.id,
                entry.category
            );
        }
    }

    #[test]
    fn merging_adds_new_defaults_without_touching_user_edits() {
        let mut mine = default_registry()[0].clone();
        mine.name = "My renamed starter".to_string();
        let existing = vec![mine.clone()];

        let (merged, added) = merge_defaults(existing, default_registry());

        assert_eq!(added, default_registry().len() - 1);
        assert_eq!(merged.len(), default_registry().len());
        let kept = merged.iter().find(|t| t.id == mine.id).unwrap();
        assert_eq!(kept.name, "My renamed starter");
    }

    #[test]
    fn merging_is_idempotent() {
        let (once, _) = merge_defaults(default_registry(), default_registry());
        let (twice, added) = merge_defaults(once.clone(), default_registry());
        assert_eq!(added, 0);
        assert_eq!(once.len(), twice.len());
    }
}
