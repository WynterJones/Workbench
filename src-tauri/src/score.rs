use crate::models::{ShipScore, ShipSignal};

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
    "clerk",
    "auth0",
    "passport",
    "supabase",
    "firebase-auth",
    "devise",
    "warden",
    "lucia",
];

const PAYMENT_KEYWORDS: &[&str] = &["stripe", "paddle", "lemonsqueezy", "braintree", "paypal"];

const DEPLOYMENT_FILES: &[&str] = &[
    "vercel.json",
    "dockerfile",
    "fly.toml",
    "netlify.toml",
    "render.yaml",
    "procfile",
];

const DOMAIN_FILES: &[&str] = &["cname"];

pub fn detect_auth(dependencies: &[String]) -> bool {
    dependencies
        .iter()
        .any(|d| AUTH_KEYWORDS.iter().any(|k| d.to_lowercase().contains(k)))
}

pub fn detect_payments(dependencies: &[String]) -> bool {
    dependencies
        .iter()
        .any(|d| PAYMENT_KEYWORDS.iter().any(|k| d.to_lowercase().contains(k)))
}

pub fn detect_deployment(root_files: &[String]) -> bool {
    root_files
        .iter()
        .any(|f| DEPLOYMENT_FILES.contains(&f.to_lowercase().as_str()))
}

pub fn detect_domain(root_files: &[String]) -> bool {
    root_files
        .iter()
        .any(|f| DOMAIN_FILES.contains(&f.to_lowercase().as_str()))
}

pub fn compute(signals: ShipSignals) -> ShipScore {
    let weighted: [(&str, &str, bool, i64); 9] = [
        ("runs", "Runs successfully", signals.runs, 25),
        ("readme", "Has a README", signals.has_readme, 10),
        ("ui", "Has a visible UI", signals.has_ui, 15),
        ("auth", "Has authentication", signals.has_auth, 10),
        ("payments", "Has payments", signals.has_payments, 10),
        ("deployment", "Has deployment config", signals.has_deployment, 10),
        ("domain", "Has a domain", signals.has_domain, 5),
        ("maintained", "Recently maintained", signals.recently_maintained, 10),
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
        assert!(result.effort_estimate.starts_with("Probably one focused session"));
    }

    #[test]
    fn detects_auth_and_payment_keywords_case_insensitively() {
        let deps = strings(&["Next-Auth", "STRIPE", "react"]);
        assert!(detect_auth(&deps));
        assert!(detect_payments(&deps));
    }

    #[test]
    fn does_not_detect_auth_or_payments_without_keywords() {
        let deps = strings(&["react", "lodash"]);
        assert!(!detect_auth(&deps));
        assert!(!detect_payments(&deps));
    }

    #[test]
    fn detects_deployment_and_domain_files() {
        let files = strings(&["Dockerfile", "CNAME", "README.md"]);
        assert!(detect_deployment(&files));
        assert!(detect_domain(&files));
    }
}
