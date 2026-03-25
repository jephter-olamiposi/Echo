//! Per-key rate limiting: dual-layer with minimum interval + sliding window quota.

use dashmap::DashMap;
use std::sync::Arc;
use std::time::Instant;

const MAX_MESSAGES_PER_WINDOW: u32 = 300;
const WINDOW_DURATION_SECS: u64 = 60;
const MIN_INTERVAL_MS: u128 = 50;

/// Controls whether the 50ms minimum inter-message interval is enforced.
pub(crate) enum IntervalPolicy {
    /// Enforce min interval — used for clipboard sync (prevents burst flooding).
    Enforce,
    /// Ignore min interval — used for auth rate limiting where burst checking is irrelevant.
    Ignore,
}

#[derive(Clone, Default)]
#[repr(align(64))] // prevent false sharing between DashMap shard entries
struct RateLimitState {
    last_message: Option<Instant>,
    message_count: u32,
    window_start: Option<Instant>,
}

impl RateLimitState {
    fn check(&mut self, policy: &IntervalPolicy, max_count: u32, window_secs: u64) -> bool {
        let now = Instant::now();

        if let IntervalPolicy::Enforce = policy {
            if let Some(last) = self.last_message {
                if now.duration_since(last).as_millis() < MIN_INTERVAL_MS {
                    return false;
                }
            }
        }

        let window_start = self.window_start.get_or_insert(now);
        if now.duration_since(*window_start).as_secs() >= window_secs {
            self.window_start = Some(now);
            self.message_count = 0;
        }

        if self.message_count >= max_count {
            return false;
        }

        self.last_message = Some(now);
        self.message_count += 1;
        true
    }

    #[cfg(test)]
    fn reset_interval(&mut self) {
        self.last_message = None;
    }
}

#[derive(Clone, Default)]
pub(crate) struct RateLimiter(Arc<DashMap<String, RateLimitState>>);

impl RateLimiter {
    /// Per-device clipboard sync check. Enforces the 50ms min interval.
    pub(crate) fn check_device(&self, device_id: &str) -> bool {
        self.0.entry(device_id.to_string()).or_default().check(
            &IntervalPolicy::Enforce,
            MAX_MESSAGES_PER_WINDOW,
            WINDOW_DURATION_SECS,
        )
    }

    /// Custom check with caller-supplied limits. Ignores the min interval.
    /// Used for IP-based login/register throttling.
    pub(crate) fn check_custom(&self, key: &str, max_count: u32, window_secs: u64) -> bool {
        self.0.entry(key.to_string()).or_default().check(
            &IntervalPolicy::Ignore,
            max_count,
            window_secs,
        )
    }

    /// Resets the minimum interval for a key so the next call isn't blocked.
    /// Only available in tests to avoid flaky timing-dependent test setup.
    #[cfg(test)]
    pub fn reset_interval_for(&self, key: &str) {
        if let Some(mut entry) = self.0.get_mut(key) {
            entry.reset_interval();
        }
    }
}
