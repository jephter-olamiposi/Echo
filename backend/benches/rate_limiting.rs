//! Rate limiting benchmarks.
//!
//! Run: `cargo bench --bench rate_limiting`

use criterion::{black_box, criterion_group, criterion_main, BenchmarkId, Criterion, Throughput};
use dashmap::DashMap;
use std::collections::HashMap;
use std::sync::{Arc, RwLock};
use std::thread;
use std::time::Instant;

#[derive(Clone, Default)]
struct RateLimitState {
    last_message: Option<Instant>,
    message_count: u32,
    window_start: Option<Instant>,
}

const MAX_MESSAGES: u32 = 300;
const WINDOW_SECS: u64 = 60;
const MIN_INTERVAL_MS: u128 = 50;

#[inline]
fn check_rate_limit(state: &mut RateLimitState, now: Instant) -> bool {
    if let Some(last) = state.last_message {
        if now.duration_since(last).as_millis() < MIN_INTERVAL_MS {
            return false;
        }
    }

    let window_start = state.window_start.get_or_insert(now);
    if now.duration_since(*window_start).as_secs() >= WINDOW_SECS {
        state.message_count = 0;
        state.window_start = Some(now);
    }

    if state.message_count >= MAX_MESSAGES {
        return false;
    }

    state.message_count += 1;
    state.last_message = Some(now);
    true
}

fn bench_single(c: &mut Criterion) {
    let mut group = c.benchmark_group("rate_limit");
    group.throughput(Throughput::Elements(1));

    group.bench_function("single_check", |b| {
        let mut state = RateLimitState::default();
        b.iter(|| black_box(check_rate_limit(&mut state, Instant::now())))
    });

    group.bench_function("burst_100", |b| {
        b.iter(|| {
            let mut state = RateLimitState::default();
            let now = Instant::now();
            for _ in 0..100 {
                black_box(check_rate_limit(&mut state, now));
            }
        })
    });

    group.finish();
}

fn bench_sequential(c: &mut Criterion) {
    let mut group = c.benchmark_group("sequential");

    for n in [10, 100, 1000] {
        group.throughput(Throughput::Elements(n));

        // RwLock baseline
        let rwlock_map: Arc<RwLock<HashMap<u32, RateLimitState>>> = Arc::new(RwLock::new(
            (0..n as u32)
                .map(|i| (i, RateLimitState::default()))
                .collect(),
        ));

        group.bench_with_input(BenchmarkId::new("rwlock", n), &rwlock_map, |b, map| {
            b.iter(|| {
                let now = Instant::now();
                let mut m = map.write().unwrap();
                for i in 0..n as u32 {
                    if let Some(state) = m.get_mut(&i) {
                        black_box(check_rate_limit(state, now));
                    }
                }
            })
        });

        // DashMap
        let dashmap: DashMap<u32, RateLimitState> = (0..n as u32)
            .map(|i| (i, RateLimitState::default()))
            .collect();

        group.bench_with_input(BenchmarkId::new("dashmap", n), &dashmap, |b, map| {
            b.iter(|| {
                let now = Instant::now();
                for i in 0..n as u32 {
                    if let Some(mut entry) = map.get_mut(&i) {
                        black_box(check_rate_limit(entry.value_mut(), now));
                    }
                }
            })
        });
    }

    group.finish();
}

fn bench_concurrent(c: &mut Criterion) {
    let mut group = c.benchmark_group("concurrent");

    for n_threads in [2, 4, 8] {
        let n_keys = 100u32;
        group.throughput(Throughput::Elements((n_keys * n_threads as u32) as u64));

        // RwLock under contention
        group.bench_with_input(
            BenchmarkId::new("rwlock", n_threads),
            &n_threads,
            |b, &n| {
                let map: Arc<RwLock<HashMap<u32, RateLimitState>>> = Arc::new(RwLock::new(
                    (0..n_keys)
                        .map(|i| (i, RateLimitState::default()))
                        .collect(),
                ));

                b.iter(|| {
                    let handles: Vec<_> = (0..n)
                        .map(|_| {
                            let map = map.clone();
                            thread::spawn(move || {
                                let now = Instant::now();
                                for i in 0..n_keys {
                                    let mut m = map.write().unwrap();
                                    if let Some(state) = m.get_mut(&i) {
                                        black_box(check_rate_limit(state, now));
                                    }
                                }
                            })
                        })
                        .collect();

                    for h in handles {
                        h.join().unwrap();
                    }
                })
            },
        );

        // DashMap under contention (should be faster)
        group.bench_with_input(
            BenchmarkId::new("dashmap", n_threads),
            &n_threads,
            |b, &n| {
                let map: Arc<DashMap<u32, RateLimitState>> = Arc::new(
                    (0..n_keys)
                        .map(|i| (i, RateLimitState::default()))
                        .collect(),
                );

                b.iter(|| {
                    let handles: Vec<_> = (0..n)
                        .map(|_| {
                            let map = map.clone();
                            thread::spawn(move || {
                                let now = Instant::now();
                                for i in 0..n_keys {
                                    if let Some(mut entry) = map.get_mut(&i) {
                                        black_box(check_rate_limit(entry.value_mut(), now));
                                    }
                                }
                            })
                        })
                        .collect();

                    for h in handles {
                        h.join().unwrap();
                    }
                })
            },
        );
    }

    group.finish();
}

criterion_group!(benches, bench_single, bench_sequential, bench_concurrent);
criterion_main!(benches);
