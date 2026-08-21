use crate::models::{Framework, ShipScore, ShipSignal};

#[derive(Debug, Clone, Copy, Default)]
pub struct ShipSignals {
    pub runs: bool,
    pub has_readme: bool,
    pub has_ui: bool,
    pub has_auth: bool,
    pub has_payments: bool,
    pub has_deployment: bool,
    pub has_domain: bool,
    pub recently_maintained: bool,
    pub has_tests: bool,
}

const AUTH_KEYWORDS: &[&str] = &[
    "next-auth",
    "@auth/",
    "better-auth",
    "clerk",
    "auth0",
    "passport",
    "supabase",
    "firebase-auth",
    "lucia",
    "workos",
    "kinde",
    "keycloak",
    "jsonwebtoken",
    "jose",
    "bcrypt",
    "argon2",
    "oauth",
    "devise",
    "warden",
    "omniauth",
    "doorkeeper",
    "authlib",
    "flask-login",
    "django-allauth",
    "gothic",
    "goth",
];

const PAYMENT_KEYWORDS: &[&str] = &[
    "stripe",
    "paddle",
    "lemonsqueezy",
    "lemon-squeezy",
    "braintree",
    "paypal",
    "razorpay",
    "chargebee",
    "recurly",
    "adyen",
    "mollie",
    "polar-sh",
];

const DEPLOYMENT_FILES: &[&str] = &[
    "vercel.json",
    "now.json",
    ".vercel",
    "dockerfile",
    "docker-compose.yml",
    "docker-compose.yaml",
    "fly.toml",
    "netlify.toml",
    "render.yaml",
    "render.com.yaml",
    "railway.json",
    "railway.toml",
    "wrangler.toml",
    "wrangler.jsonc",
    "app.yaml",
    "procfile",
    "captain-definition",
    "k8s",
    "helm",
    ".github/workflows",
    ".gitlab-ci.yml",
];

const DOMAIN_FILES: &[&str] = &["cname"];

const UI_MARKERS: &[&str] = &[
    "index.html",
    "public",
    "templates",
    "views",
    "www",
    "frontend",
    "client",
    "web",
    "ui",
];

fn mentions(haystack: &str, keywords: &[&str]) -> bool {
    let lowered = haystack.to_lowercase();
    keywords.iter().any(|keyword| lowered.contains(keyword))
}

pub fn detect_auth(manifests: &str) -> bool {
    mentions(manifests, AUTH_KEYWORDS)
}

pub fn detect_payments(manifests: &str) -> bool {
    mentions(manifests, PAYMENT_KEYWORDS)
}

pub fn detect_deployment(root_files: &[String]) -> bool {
    root_files
        .iter()
        .any(|f| DEPLOYMENT_FILES.contains(&f.to_lowercase().as_str()))
}

pub fn detect_domain(root_files: &[String], homepage: Option<&str>) -> bool {
    if homepage.map(|url| !url.trim().is_empty()).unwrap_or(false) {
        return true;
    }
    root_files
        .iter()
        .any(|f| DOMAIN_FILES.contains(&f.to_lowercase().as_str()))
}

pub fn detect_ui(framework: Framework, root_files: &[String], has_screenshot: bool) -> bool {
    if has_screenshot {
        return true;
    }
    if matches!(
        framework,
        Framework::Nextjs
            | Framework::Vite
            | Framework::Tauri
            | Framework::Rails
            | Framework::ChromeExtension
            | Framework::Godot
            | Framework::Wordpress
            | Framework::Static
    ) {
        return true;
    }
    root_files.iter().any(|f| {
        let name = f.to_lowercase();
        UI_MARKERS.contains(&name.as_str()) || name.ends_with(".html")
    })
}

pub fn compute(signals: ShipSignals) -> ShipScore {
    let weighted: [(&str, &str, bool, i64); 9] = [
        ("runs", "Runs successfully", signals.runs, 25),
        ("readme", "Has a README", signals.has_readme, 10),
        ("ui", "Has a visible UI", signals.has_ui, 15),
        ("auth", "Has authentication", signals.has_auth, 10),
        ("payments", "Has payments", signals.has_payments, 10),
        (
            "deployment",
            "Has deployment config",
            signals.has_deployment,
            10,
        ),
        ("domain", "Has a domain", signals.has_domain, 5),
        (
            "maintained",
            "Recently maintained",
            signals.recently_maintained,
            10,
        ),
        ("tests", "Has tests", signals.has_tests, 5),
    ];

    let mut ship_signals = Vec::with_capacity(weighted.len());
    let mut score = 0i64;

    for (key, label, passed, weight) in weighted {
        if passed {
            score += weight;
        }
        ship_signals.push(ShipSignal {
            key: key.to_string(),
            label: label.to_string(),
            passed,
            weight,
        });
    }

    ShipScore {
        score,
        signals: ship_signals,
        effort_estimate: effort_estimate(score).to_string(),
    }
}

fn effort_estimate(score: i64) -> &'static str {
    match score {
        80..=100 => "Ready to ship — polish and launch",
        60..=79 => "Probably one focused session from publishable",
        40..=59 => "A few sessions away — core gaps remain",
        20..=39 => "Early stage — most ship signals missing",
        _ => "Just a prototype — long way from shippable",
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn strings(items: &[&str]) -> Vec<String> {
        items.iter().map(|s| s.to_string()).collect()
    }

    #[test]
    fn full_signals_score_100_and_ready_band() {
        let signals = ShipSignals {
            runs: true,
            has_readme: true,
            has_ui: true,
            has_auth: true,
            has_payments: true,
            has_deployment: true,
            has_domain: true,
            recently_maintained: true,
            has_tests: true,
        };
        let result = compute(signals);
        assert_eq!(result.score, 100);
        assert!(result.effort_estimate.starts_with("Ready to ship"));
        assert_eq!(result.signals.len(), 9);
    }

    #[test]
    fn no_signals_score_zero_and_prototype_band() {
        let result = compute(ShipSignals::default());
        assert_eq!(result.score, 0);
        assert!(result.effort_estimate.contains("prototype"));
    }

    #[test]
    fn runs_plus_readme_plus_ui_lands_in_one_session_band() {
        let signals = ShipSignals {
            runs: true,
            has_readme: true,
            has_ui: true,
            recently_maintained: true,
            ..ShipSignals::default()
        };
        let result = compute(signals);
        assert_eq!(result.score, 60);
        assert!(result
            .effort_estimate
            .starts_with("Probably one focused session"));
    }

    #[test]
    fn detects_auth_and_payment_keywords_case_insensitively() {
        let manifest = r#"{"dependencies": {"Next-Auth": "5", "STRIPE": "16", "react": "19"}}"#;
        assert!(detect_auth(manifest));
        assert!(detect_payments(manifest));
    }

    #[test]
    fn detects_dependencies_outside_javascript() {
        assert!(detect_auth("[dependencies]\nargon2 = \"0.5\""));
        assert!(detect_auth("gem 'devise'"));
        assert!(detect_payments("stripe==11.1.0"));
    }

    #[test]
    fn does_not_detect_auth_or_payments_without_keywords() {
        let manifest = r#"{"dependencies": {"react": "19", "lodash": "4"}}"#;
        assert!(!detect_auth(manifest));
        assert!(!detect_payments(manifest));
    }

    #[test]
    fn detects_deployment_and_domain_files() {
        let files = strings(&["Dockerfile", "CNAME", "README.md"]);
        assert!(detect_deployment(&files));
        assert!(detect_domain(&files, None));
        assert!(detect_deployment(&strings(&[".github/workflows"])));
        assert!(!detect_deployment(&strings(&["README.md"])));
    }

    #[test]
    fn a_saved_homepage_counts_as_a_domain() {
        assert!(detect_domain(&[], Some("https://nabu.sh")));
        assert!(!detect_domain(&[], Some("   ")));
        assert!(!detect_domain(&[], None));
    }

    #[test]
    fn web_frameworks_have_a_ui_without_a_screenshot() {
        assert!(detect_ui(Framework::Vite, &[], false));
        assert!(detect_ui(Framework::Nextjs, &[], false));
        assert!(!detect_ui(Framework::Rust, &[], false));
    }

    #[test]
    fn a_backend_project_gets_ui_credit_only_with_real_evidence() {
        assert!(detect_ui(
            Framework::Go,
            &strings(&["templates", "main.go"]),
            false
        ));
        assert!(detect_ui(
            Framework::Python,
            &strings(&["app.py", "index.html"]),
            false
        ));
        assert!(!detect_ui(
            Framework::Python,
            &strings(&["app.py", "cli.py"]),
            false
        ));
        assert!(detect_ui(Framework::Rust, &strings(&["src"]), true));
    }
}
