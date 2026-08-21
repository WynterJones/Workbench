use std::collections::HashMap;
use std::path::Path;
use std::sync::Mutex;
use std::time::{Duration, Instant, SystemTime};

use super::listing::{FsEntry, ListOptions};

const MAX_ENTRIES: usize = 200;
const MAX_AGE: Duration = Duration::from_secs(120);

#[derive(Clone)]
struct CachedListing {
    mtime: SystemTime,
    options: ListOptions,
    entries: Vec<FsEntry>,
    inserted: u64,
    cached_at: Instant,
}

#[derive(Default)]
pub struct ListingCache {
    inner: Mutex<Inner>,
}

#[derive(Default)]
struct Inner {
    map: HashMap<String, CachedListing>,
    clock: u64,
}

fn directory_mtime(path: &Path) -> Option<SystemTime> {
    std::fs::metadata(path).ok()?.modified().ok()
}

impl ListingCache {
    pub fn get(&self, path: &Path, options: &ListOptions) -> Option<Vec<FsEntry>> {
        let mtime = directory_mtime(path)?;
        let key = path.to_string_lossy().to_string();
        let inner = self.inner.lock().ok()?;
        let hit = inner.map.get(&key)?;
        (hit.mtime == mtime && hit.cached_at.elapsed() < MAX_AGE && &hit.options == options)
            .then(|| hit.entries.clone())
    }

    pub fn put(&self, path: &Path, options: &ListOptions, entries: &[FsEntry]) {
        let Some(mtime) = directory_mtime(path) else {
            return;
        };
        let Ok(mut inner) = self.inner.lock() else {
            return;
        };

        inner.clock += 1;
        let inserted = inner.clock;
        inner.map.insert(
            path.to_string_lossy().to_string(),
            CachedListing {
                mtime,
                options: options.clone(),
                entries: entries.to_vec(),
                inserted,
                cached_at: Instant::now(),
            },
        );

        if inner.map.len() > MAX_ENTRIES {
            if let Some(oldest) = inner
                .map
                .iter()
                .min_by_key(|(_, value)| value.inserted)
                .map(|(key, _)| key.clone())
            {
                inner.map.remove(&oldest);
            }
        }
    }

    pub fn invalidate(&self, path: &Path) {
        if let Ok(mut inner) = self.inner.lock() {
            inner.map.remove(path.to_string_lossy().as_ref());
        }
    }

    #[cfg(test)]
    pub fn len(&self) -> usize {
        self.inner.lock().map(|inner| inner.map.len()).unwrap_or(0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    fn options() -> ListOptions {
        ListOptions::default()
    }

    fn temp(name: &str) -> std::path::PathBuf {
        let dir = std::env::temp_dir().join(format!("wb_cache_{name}"));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn returns_a_hit_while_the_directory_is_unchanged() {
        let dir = temp("hit");
        let cache = ListingCache::default();
        cache.put(&dir, &options(), &[]);
        assert!(cache.get(&dir, &options()).is_some());
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn misses_after_the_directory_changes() {
        let dir = temp("miss");
        let cache = ListingCache::default();
        cache.put(&dir, &options(), &[]);

        std::thread::sleep(std::time::Duration::from_millis(20));
        fs::write(dir.join("new.txt"), "x").unwrap();
        assert!(cache.get(&dir, &options()).is_none());
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn misses_when_the_sort_options_differ() {
        let dir = temp("options");
        let cache = ListingCache::default();
        cache.put(&dir, &options(), &[]);

        let mut other = options();
        other.sort_desc = !other.sort_desc;
        assert!(cache.get(&dir, &other).is_none());
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn invalidate_drops_the_entry() {
        let dir = temp("invalidate");
        let cache = ListingCache::default();
        cache.put(&dir, &options(), &[]);
        cache.invalidate(&dir);
        assert!(cache.get(&dir, &options()).is_none());
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn evicts_the_oldest_entry_past_the_cap() {
        let cache = ListingCache::default();
        let mut dirs = Vec::new();
        for i in 0..(MAX_ENTRIES + 5) {
            let dir = temp(&format!("evict_{i}"));
            cache.put(&dir, &options(), &[]);
            dirs.push(dir);
        }
        assert!(cache.len() <= MAX_ENTRIES);
        for dir in dirs {
            let _ = fs::remove_dir_all(dir);
        }
    }
}
