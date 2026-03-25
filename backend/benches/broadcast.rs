//! Broadcast channel benchmarks.
//!
//! Run: `cargo bench --bench broadcast`

use criterion::{black_box, criterion_group, criterion_main, BenchmarkId, Criterion, Throughput};
use tokio::sync::broadcast;

#[derive(Clone, Debug)]
#[allow(dead_code)]
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
    let rt = tokio::runtime::Runtime::new().unwrap();
    let mut group = c.benchmark_group("concurrent_async");

    for n_tasks in [2, 4, 8, 16, 32] {
        group.throughput(Throughput::Elements(100 * n_tasks as u64));

        group.bench_with_input(BenchmarkId::new("tasks", n_tasks), &n_tasks, |b, &n| {
            b.iter(|| {
                rt.block_on(async {
                    let (tx, _) = broadcast::channel::<Message>(256);

                    let handles: Vec<_> = (0..n)
                        .map(|_| {
                            let mut rx = tx.subscribe();
                            tokio::spawn(async move {
                                let mut count = 0;
                                while let Ok(_) = rx.recv().await {
                                    count += 1;
                                }
                                count
                            })
                        })
                        .collect();

                    for _ in 0..100 {
                        let _ = tx.send(Message::small());
                    }
                    drop(tx);

                    let total: usize = futures::future::join_all(handles)
                        .await
                        .into_iter()
                        .filter_map(|r| r.ok())
                        .sum();
                    black_box(total)
                })
            })
        });
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
