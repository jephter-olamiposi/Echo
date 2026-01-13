//! Broadcast channel benchmarks.
//!
//! Run: `cargo bench --bench broadcast`

use criterion::{black_box, criterion_group, criterion_main, BenchmarkId, Criterion, Throughput};
use std::sync::Arc;
use tokio::sync::broadcast;

#[derive(Clone, Debug)]
#[allow(dead_code)] // content is consumed via black_box
struct Message {
    content: String,
}

impl Message {
    fn small() -> Self {
        Self {
            content: "hello".into(),
        }
    }

    fn sized(n: usize) -> Self {
        Self {
            content: "x".repeat(n),
        }
    }
}

fn bench_fanout(c: &mut Criterion) {
    let rt = tokio::runtime::Runtime::new().unwrap();
    let mut group = c.benchmark_group("fanout");

    for n in [1, 5, 10, 50] {
        group.throughput(Throughput::Elements(n));

        group.bench_with_input(BenchmarkId::new("subscribers", n), &n, |b, &n| {
            // Setup outside iter
            let (tx, _) = broadcast::channel::<Message>(128);
            let mut rxs: Vec<_> = (0..n).map(|_| tx.subscribe()).collect();

            b.iter(|| {
                rt.block_on(async {
                    tx.send(Message::small()).unwrap();
                    for rx in &mut rxs {
                        black_box(rx.recv().await.unwrap());
                    }
                })
            })
        });
    }

    group.finish();
}

fn bench_payload(c: &mut Criterion) {
    let rt = tokio::runtime::Runtime::new().unwrap();
    let mut group = c.benchmark_group("payload");

    for size in [100, 1_000, 10_000] {
        group.throughput(Throughput::Bytes(size));

        let msg = Message::sized(size as usize);
        let (tx, _) = broadcast::channel::<Message>(16);
        let mut rx = tx.subscribe();

        group.bench_with_input(BenchmarkId::new("bytes", size), &msg, |b, msg| {
            b.iter(|| {
                rt.block_on(async {
                    tx.send(msg.clone()).unwrap();
                    black_box(rx.recv().await.unwrap())
                })
            })
        });
    }

    group.finish();
}

fn bench_concurrent_fanout(c: &mut Criterion) {
    use std::sync::atomic::{AtomicUsize, Ordering};
    use std::thread;

    let mut group = c.benchmark_group("concurrent");

    for n_threads in [2, 4, 8] {
        group.throughput(Throughput::Elements(100 * n_threads as u64));

        group.bench_with_input(
            BenchmarkId::new("threads", n_threads),
            &n_threads,
            |b, &n| {
                let tx = Arc::new(broadcast::Sender::<Message>::new(256));

                b.iter(|| {
                    let counter = Arc::new(AtomicUsize::new(0));
                    let handles: Vec<_> = (0..n)
                        .map(|_| {
                            let mut rx = tx.subscribe();
                            let counter = counter.clone();
                            thread::spawn(move || {
                                while let Ok(_) = rx.try_recv() {
                                    counter.fetch_add(1, Ordering::Relaxed);
                                }
                            })
                        })
                        .collect();

                    for _ in 0..100 {
                        let _ = tx.send(Message::small());
                    }

                    for h in handles {
                        let _ = h.join();
                    }

                    black_box(counter.load(Ordering::Relaxed))
                })
            },
        );
    }

    group.finish();
}

criterion_group!(
    benches,
    bench_fanout,
    bench_payload,
    bench_concurrent_fanout
);
criterion_main!(benches);
