---
trigger: always_on
---

# Rust Engineering Doctrine

> **v3.0 · Universal — scales from CLI tools to distributed systems**
> Senior Rust Engineer & Systems Architect — Production Standards
>
> Canonical references: [The Rust Book](https://doc.rust-lang.org/book/) · [Rust Reference](https://doc.rust-lang.org/reference/) · [std docs](https://doc.rust-lang.org/std/) · [Rustonomicon](https://doc.rust-lang.org/nomicon/) · [Rust API Guidelines](https://rust-lang.github.io/api-guidelines/) · [Async Book](https://rust-lang.github.io/async-book/) · [Cargo Book](https://doc.rust-lang.org/cargo/) · [docs.rs](https://docs.rs/) · [crates.io](https://crates.io/)

---

## Prime Directive

> Read first. Consult official docs before coding or debugging.
> Think with the type system. Do not cargo-cult.
> **Ship minimal, correct, idiomatic, production-ready Rust.**

Rules are ordered by priority. Higher rules override lower ones.

---

## Rule 1 — Context First `[NON-NEGOTIABLE]`

Before writing a single line of code, recon the codebase completely:

```sh
cargo metadata --no-deps --format-version 1 | jq '.packages[].name'
cat Cargo.toml Cargo.lock 2>/dev/null || true
find . -name '*.rs' | head -60
rg --hidden -n "^pub (fn|struct|enum|trait|type|mod) " -g '!target' src/ || true
rg --hidden -n "#\[cfg\(|unsafe |TODO|FIXME|SAFETY" -g '!target' || true
```

**Exit criteria:** You must be able to name the 3 most relevant modules to your change. If you cannot — recon is incomplete.

Ask and answer before proceeding:

- Does this logic already exist in the codebase?
- Does `std` or `core` already provide this? (`std::collections`, `std::sync`, `std::io`, etc.)
- Is there an existing domain type that models this concept?
- Am I changing a `pub` API that other crates or binaries depend on?

If a capability already exists — **reuse or refactor. Duplication is a defect.**

---

## Rule 2 — Official Documentation First `[REQUIRED]`

Before implementing or debugging, consult in this order:

1. **`std` / `core` / `alloc`** — always exhaust the standard library first
2. **The Rust Book** — ownership, traits, generics, lifetimes, error handling, modules
3. **Rust Reference** — language semantics, type layout, expressions, patterns
4. **Rust API Guidelines** — naming conventions, trait implementations, documentation
5. **Rustonomicon** — when unsafe code is involved
6. **Async Book** — when async/await or futures are involved
7. **Cargo Book** — workspaces, features, profiles, build scripts
8. **`docs.rs`** — crate-level API docs before reading source
9. **RFCs / tracking issues** — for unstable features or design rationale

Documentation informs decisions. It does not replace reasoning. No cargo-culting.

---

## Rule 3 — Stop on Ambiguity `[CRITICAL]`

| Ambiguity type | Required action |
|---|---|
| Affects correctness, public API, or architecture | **Stop. Escalate. Do not proceed.** |
| Small, local, reversible (e.g. a field name, a variable name) | Proceed with the conservative choice; document the assumption inline. |

Never silently guess. Guessing is a **correctness failure**.

---

## Rule 4 — Production Only `[CRITICAL]`

- No `TODO`, `FIXME`, `XXX`, or commented-out code
- No stubs, fake implementations, or placeholder returns
- Every `pub` API must be complete, documented, and production-valid
- `unwrap()` and `expect()` are **banned in production code** (see §6)

Incomplete work is deferred, not merged.

---

## Rule 5 — Minimal Change `[REQUIRED]`

- Smallest viable change that satisfies the requirement
- Fewest new dependencies; every new dependency requires explicit justification
- A **well-adopted crate** means: actively maintained, >1 M downloads/month, no known soundness issues, ideally part of the rust-lang or well-known org
- Complexity must earn its place — if a simpler solution exists in `std`, use `std`

---

## 1. Project & Workspace Layout

### Standard Cargo layout

Follow the [Cargo Book conventions](https://doc.rust-lang.org/cargo/guide/project-layout.html) exactly:

```
my-project/
├── Cargo.toml          # workspace or package manifest
├── Cargo.lock          # always committed for binaries; .gitignored for libraries
├── src/
│   ├── lib.rs          # library crate root (if lib)
│   ├── main.rs         # binary crate root (if bin)
│   └── bin/            # additional binaries
│       └── tool.rs
├── tests/              # integration tests (each file is a separate crate)
├── benches/            # criterion benchmarks
├── examples/           # runnable examples (cargo run --example)
└── build.rs            # build script (only if genuinely required)
```

### Workspace structure (multi-crate projects)

```
workspace/
├── Cargo.toml          # [workspace] manifest — lists members
├── Cargo.lock          # single lock file for the whole workspace
├── crates/
│   ├── core/           # pure domain logic — no I/O, no async
│   ├── storage/        # persistence layer
│   ├── api/            # HTTP / gRPC / protocol layer
│   └── cli/            # binary entry point
└── tests/              # workspace-level integration tests
```

**Workspace rules:**
- Separate domain logic from I/O from protocol from entry points
- Share a single `[workspace.dependencies]` table for version pinning
- Use `path = "..."` for intra-workspace deps; never publish internal crates with version deps that drift

### Cargo.toml hygiene

```toml
[package]
name    = "my-crate"
version = "0.1.0"
edition = "2021"           # always edition 2021+
rust-version = "1.75"      # set MSRV explicitly
license = "MIT OR Apache-2.0"
description = "One sentence."

[dependencies]
# Pin to minor version for libraries; exact for binaries when reproducibility matters
tokio = { version = "1", features = ["rt-multi-thread", "macros"] }

[dev-dependencies]
# Test-only deps here — never bleed into [dependencies]

[profile.release]
lto           = true       # enable link-time optimisation
codegen-units = 1          # maximise optimisation
strip         = "symbols"  # reduce binary size
```

---

## 2. Module & Visibility System

Reference: [The Rust Book — ch.7](https://doc.rust-lang.org/book/ch07-00-managing-growing-projects-with-packages-crates-and-modules.html)

### Module organisation rules

- One conceptual concern per module
- Prefer `mod foo;` (separate file) over inline `mod foo { ... }` once a module exceeds ~80 lines
- Keep `lib.rs` / `main.rs` as thin orchestration roots — no substantive logic
- Use `pub(crate)` liberally; `pub` only at the crate boundary or deliberate API surface
- Use `pub(super)` to expose to a parent module without widening to the whole crate

```rust
// ✓ explicit visibility ladder
pub struct Config { ... }          // public API
pub(crate) struct InternalCache { ... } // crate-internal
pub(super) fn bootstrap() { ... }  // parent-only
fn validate(s: &str) -> bool { ... } // private
```

### Re-exports and the public API surface

- Use `pub use` in `lib.rs` to flatten the public API
- Do not force callers to import through deep internal paths
- Follow [API Guidelines C-REEXPORT](https://rust-lang.github.io/api-guidelines/necessities.html)

```rust
// lib.rs — re-export the public surface
pub use crate::config::Config;
pub use crate::error::Error;
pub use crate::client::Client;
```

---

## 3. Type System — Model the Domain

Reference: [The Rust Book — ch.6, ch.10](https://doc.rust-lang.org/book/ch06-00-enums.html)

### Algebraic Data Types first

Use `enum` to make **invalid states unrepresentable**. Use exhaustive `match` to surface logic gaps at compile time.

```rust
// ✗ boolean flags for state — banned
struct Connection {
    is_connected: bool,
    is_authenticated: bool,
}

// ✓ encode all valid states in the type
enum ConnectionState {
    Disconnected,
    Connected { session_id: SessionId },
    Authenticated { session_id: SessionId, user: UserId },
}
```

### Newtypes for domain constraints

Use newtypes to enforce invariants at construction, not at every call site:

```rust
/// An email address that has been validated.
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct EmailAddress(String);

impl EmailAddress {
    pub fn parse(raw: &str) -> Result<Self, InvalidEmail> {
        if raw.contains('@') {
            Ok(Self(raw.to_owned()))
        } else {
            Err(InvalidEmail(raw.to_owned()))
        }
    }

    pub fn as_str(&self) -> &str { &self.0 }
}

impl fmt::Display for EmailAddress {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(&self.0)
    }
}
```

### Type aliases for clarity, not hiding

```rust
// ✓ alias clarifies intent — does not hide behaviour
type Milliseconds = u64;
type NodeId = u32;

// ✗ don't use type aliases to smuggle unchecked values through APIs
//   use newtypes + validation instead
```

### Builder pattern for complex construction

When a struct has many optional fields or requires validation across fields:

```rust
pub struct RequestBuilder {
    url: String,
    timeout: Option<Duration>,
    retries: u32,
}

impl RequestBuilder {
    pub fn new(url: impl Into<String>) -> Self { ... }
    pub fn timeout(mut self, d: Duration) -> Self { self.timeout = Some(d); self }
    pub fn retries(mut self, n: u32) -> Self { self.retries = n; self }
    pub fn build(self) -> Result<Request, BuildError> { ... }
}
```

### Derive order convention

```rust
#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, Hash)]
// Debug always first; implement manually only when derived output is misleading
```

---

## 4. Ownership, Borrowing & Lifetimes

Reference: [The Rust Book — ch.4, ch.10](https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html)

### Ownership rules (compiler-enforced — know them cold)

1. Every value has exactly one owner.
2. When the owner goes out of scope, the value is dropped.
3. There can be either **one `&mut T`** or **any number of `&T`** at a time — never both.

### Prefer borrowed types in function signatures

```rust
// ✗ takes ownership unnecessarily
fn print_name(name: String) { ... }

// ✓ borrows — works with String, &str, Box<str>, Arc<str>
fn print_name(name: &str) { ... }

// ✓ general rule: accept &T, &[T], &Path, &str over owned types in fn args
//   return owned types (String, Vec<T>, PathBuf) from functions
```

### Lifetime elision — know the three rules

The compiler elides lifetimes according to [reference rules](https://doc.rust-lang.org/reference/lifetime-elision.html). Annotate explicitly only when elision is insufficient or would mislead the reader:

```rust
// explicit lifetime required — output lifetime tied to input
fn longest<'a>(a: &'a str, b: &'a str) -> &'a str {
    if a.len() > b.len() { a } else { b }
}

// 'static — only for data that truly lives for the program duration
static CONFIG: &str = "default";
```

### `Cow<'a, T>` for borrow-or-own flexibility

```rust
use std::borrow::Cow;

fn normalise(input: &str) -> Cow<'_, str> {
    if input.chars().all(|c| c.is_lowercase()) {
        Cow::Borrowed(input)   // no allocation
    } else {
        Cow::Owned(input.to_lowercase())
    }
}
```

---

## 5. Traits & Generics

Reference: [The Rust Book — ch.10](https://doc.rust-lang.org/book/ch10-00-generics.html) · [API Guidelines](https://rust-lang.github.io/api-guidelines/interoperability.html)

### Trait design

- Traits define **contracts**, not implementations
- Prefer many small, focused traits over monolithic ones (interface segregation)
- Do not put non-essential methods on a trait — callers can't partially implement
- Use [blanket impls](https://doc.rust-lang.org/book/ch10-02-traits.html#using-trait-bounds-to-conditionally-implement-methods) when a blanket is genuinely correct

```rust
// ✓ focused trait
pub trait Validate {
    type Error;
    fn validate(&self) -> Result<(), Self::Error>;
}

// ✗ god trait
pub trait Everything: Validate + Serialize + Clone + Debug + Send + Sync { ... }
```

### Standard library traits — implement them

Follow [API Guidelines C-COMMON-TRAITS](https://rust-lang.github.io/api-guidelines/interoperability.html):

| Trait | When |
|---|---|
| `Debug` | Always — use `#[derive]` |
| `Display` | All user-facing types |
| `Clone` / `Copy` | When cheap and semantically correct |
| `PartialEq` / `Eq` | Value types with meaningful equality |
| `Hash` | Alongside `Eq` for map/set keys |
| `From<T>` / `Into<T>` | Lossless conversions |
| `TryFrom<T>` / `TryInto<T>` | Fallible conversions |
| `Default` | When a zero/empty value is meaningful |
| `Iterator` | Custom sequences — compose with adapters |
| `Error` | All custom error types |
| `Send` + `Sync` | Auto-derived; pin down when deliberately not |

### `impl Trait` vs `dyn Trait`

```rust
// ✓ impl Trait — zero cost, monomorphised, use at fn boundaries
fn process(items: impl Iterator<Item = u32>) -> u64 { ... }
fn make_adder(x: i32) -> impl Fn(i32) -> i32 { move |y| x + y }

// ✓ dyn Trait — use when the set of types is open or object safety is needed
fn register(handler: Box<dyn EventHandler>) { ... }

// rules:
// - prefer impl Trait in fn args and return position
// - use dyn Trait for heterogeneous collections and plugin systems
// - Arc<dyn Trait> for shared ownership of trait objects
```

### Avoid orphan rule workarounds

Do not create wrapper types solely to impl foreign traits on foreign types. Extract the conversion into a dedicated function instead.

---

## 6. Error Handling

Reference: [The Rust Book — ch.9](https://doc.rust-lang.org/book/ch09-00-error-handling.html) · [API Guidelines C-GOOD-ERR](https://rust-lang.github.io/api-guidelines/interoperability.html#error-types-are-meaningful-and-well-behaved-c-good-err)

### The rules

- **`unwrap()` and `expect()` are banned in production code.** They are allowed only in tests and examples.
- **`panic!` is banned in production code** except for provably unreachable branches (`unreachable!()` with a documented invariant).
- Propagate errors with `?`. Wrap them into your crate's error type at module boundaries.
- Use specific error enums, not `Box<dyn Error>`, at public API boundaries.

### Error type strategy by project size

| Scenario | Recommended approach |
|---|---|
| Library crate | `thiserror` — derive `std::error::Error` with rich variants |
| Application binary | `anyhow` — `anyhow::Error` for top-level propagation |
| Embedded / `no_std` | Manual `enum Error` implementing `core::fmt::Display` |

### Defining errors with `thiserror`

```rust
use thiserror::Error;

#[derive(Debug, Error)]
pub enum ConfigError {
    #[error("config file not found at `{path}`")]
    NotFound { path: std::path::PathBuf },

    #[error("invalid TOML: {0}")]
    ParseFailed(#[from] toml::de::Error),

    #[error("missing required field `{field}`")]
    MissingField { field: &'static str },
}
```

### Error conversion with `From`

```rust
// ✓ implement From so ? coerces automatically
impl From<std::io::Error> for AppError {
    fn from(e: std::io::Error) -> Self {
        AppError::Io(e)
    }
}
```

### Never swallow errors silently

```rust
// ✗ swallows failure — banned
let _ = write!(f, "{}", val);

// ✓ propagate or handle explicitly
write!(f, "{}", val)?;
```

### `Result` and `Option` combinators

Prefer chained combinators over nested `match` when the logic is simple and linear:

```rust
// ✓ concise chaining
let port: u16 = env::var("PORT")
    .ok()
    .and_then(|s| s.parse().ok())
    .unwrap_or(8080);

// ✓ ? for early return in fallible functions
fn load_config(path: &Path) -> Result<Config, ConfigError> {
    let text = fs::read_to_string(path)?;
    let cfg: Config = toml::from_str(&text)?;
    Ok(cfg)
}
```

---

## 7. Closures, Iterators & Functional Patterns

Reference: [The Rust Book — ch.13](https://doc.rust-lang.org/book/ch13-00-functional-features.html)

### Iterator protocol

- Prefer iterator adapters over manual loops when they improve clarity
- Chain lazily — no intermediate `Vec` allocations unless you need random access
- Use `collect::<Result<Vec<_>, _>>()` to short-circuit on the first error

```rust
// ✓ lazy pipeline — single allocation at collect
let scores: Vec<u32> = raw_data
    .iter()
    .filter(|entry| entry.is_valid())
    .map(|entry| entry.score())
    .collect();

// ✓ propagate errors through iteration
let parsed: Result<Vec<u32>, _> = strings
    .iter()
    .map(|s| s.parse::<u32>())
    .collect();
```

### Closure capture and `Fn` traits

```rust
// Fn   — captures by reference; callable many times
// FnMut — captures by mutable reference; callable many times (may mutate)
// FnOnce — takes ownership; callable exactly once

// prefer the least restrictive bound
fn apply<F: Fn(u32) -> u32>(f: F, x: u32) -> u32 { f(x) }

// use move to transfer ownership into the closure (required for threads/async)
let msg = String::from("hello");
thread::spawn(move || println!("{msg}"));
```

---

## 8. Unsafe Code

Reference: [Rustonomicon](https://doc.rust-lang.org/nomicon/) · [The Rust Reference — Unsafe](https://doc.rust-lang.org/reference/unsafe-code.html)

### Rules — no exceptions

- `unsafe` is allowed **only when unavoidable** — exhaust safe alternatives first
- Every `unsafe` block **must** have a `// SAFETY:` comment documenting the invariant that makes it correct
- `unsafe` blocks without a `SAFETY` comment are **rejected at review**
- Keep `unsafe` blocks as small as possible — wrap them in a safe abstraction immediately
- All invariants must align with the Rustonomicon

```rust
// ✓ minimal unsafe block with invariant comment
pub fn split_at_unchecked(slice: &[u8], mid: usize) -> (&[u8], &[u8]) {
    // SAFETY: caller guarantees `mid <= slice.len()`; the resulting slices are
    // non-overlapping, within bounds, and valid for the lifetime of `slice`.
    unsafe {
        (
            std::slice::from_raw_parts(slice.as_ptr(), mid),
            std::slice::from_raw_parts(slice.as_ptr().add(mid), slice.len() - mid),
        )
    }
}

// ✓ wrap raw unsafe in a safe public API
pub fn safe_split(slice: &[u8], mid: usize) -> Option<(&[u8], &[u8])> {
    if mid <= slice.len() {
        Some(split_at_unchecked(slice, mid))
    } else {
        None
    }
}
```

### `unreachable!()` for provably dead branches

```rust
match direction {
    Direction::North => ...,
    Direction::South => ...,
    Direction::East  => ...,
    Direction::West  => ...,
    // If the enum gains a variant, the compiler will force you to handle it.
}

// Only use unreachable!() when an invariant external to the type system
// guarantees a branch is dead:
// unreachable!("message queue is bounded; receiver cannot lag without sender")
```

---

## 9. Concurrency & Async

Reference: [The Rust Book — ch.16](https://doc.rust-lang.org/book/ch16-00-concurrency.html) · [Async Book](https://rust-lang.github.io/async-book/)

### Assumed runtime: `tokio`

Use `tokio` as the default async runtime. Do not mix runtimes in a single binary.

### Thread safety — understand `Send` and `Sync`

```
T: Send   — T can be transferred to another thread
T: Sync   — &T can be shared across threads (T: Sync iff &T: Send)
```

The compiler enforces these automatically. If you reach for `unsafe impl Send`, document the exact invariant that makes it safe.

### Concurrency model preference

| Pattern | Status | When to use |
|---|---|---|
| Message passing — `mpsc`, `oneshot`, `broadcast` | ✓ Preferred | State owned by one task, communicated by message |
| `Arc<Mutex<T>>` with documented justification | ⚠ Allowed | Shared mutable state genuinely required |
| `Arc<Mutex<T>>` as default | ✗ Prohibited | Never the starting point |
| `Arc<RwLock<T>>` | ⚠ Allowed | Read-heavy shared state; document the access pattern |

### Async function rules

```rust
// ✓ async fn for I/O-bound work
async fn fetch_user(id: UserId) -> Result<User, ApiError> { ... }

// ✗ never block inside async code
async fn bad() {
    std::thread::sleep(Duration::from_secs(1)); // blocks the executor thread
    std::fs::read_to_string("file.txt").unwrap(); // blocks
}

// ✓ use async equivalents
async fn good() {
    tokio::time::sleep(Duration::from_secs(1)).await;
    tokio::fs::read_to_string("file.txt").await.unwrap();
}

// ✓ offload CPU-bound work
async fn with_cpu_work() -> Result<Output, Error> {
    tokio::task::spawn_blocking(|| expensive_computation())
        .await
        .map_err(|e| Error::TaskPanic(e.to_string()))?
}
```

### Channels (tokio)

```rust
// mpsc — multiple producers, single consumer (most common)
let (tx, mut rx) = tokio::sync::mpsc::channel::<Message>(32);

// oneshot — single value, single consumer
let (tx, rx) = tokio::sync::oneshot::channel::<Response>();

// broadcast — one producer, many consumers (fan-out)
let (tx, _rx) = tokio::sync::broadcast::channel::<Event>(64);

// watch — single producer, multiple readers of the latest value
let (tx, rx) = tokio::sync::watch::channel(initial_value);
```

### `select!` — cancellation safety

All branches of a `select!` must be **cancellation-safe** — that is, safe to drop without completing. Document non-obvious cancellation behaviour.

```rust
// ✓ cancellation-safe: recv() on a channel is safe to cancel
tokio::select! {
    Some(msg) = rx.recv() => handle(msg),
    _ = shutdown.recv() => return,
}
```

### Shared state checklist

Before reaching for `Arc<Mutex<T>>`:
- [ ] Can this state be owned by a single task and accessed via channels?
- [ ] Is the lock held for the minimum possible duration?
- [ ] Is there a risk of deadlock (locks acquired in inconsistent order)?
- [ ] Would `RwLock` be better given the read/write ratio?
- [ ] Is `std::sync::Mutex` sufficient, or is `tokio::sync::Mutex` required?
  - Use `std::sync::Mutex` for non-async critical sections (faster)
  - Use `tokio::sync::Mutex` only when you need to hold the lock across `.await`

---

## 10. Memory & Performance

Reference: [The Rust Book — ch.15](https://doc.rust-lang.org/book/ch15-00-smart-pointers.html) · [std::collections](https://doc.rust-lang.org/std/collections/)

### Smart pointer decision tree

```
Need heap allocation?
  └─ Single owner, one thread      → Box<T>
  └─ Shared ownership, one thread  → Rc<T>
  └─ Shared ownership, multi-thread → Arc<T>
  └─ Interior mutability, one thread → Cell<T> / RefCell<T>
  └─ Interior mutability, multi-thread → Mutex<T> / RwLock<T> / Atomic*

Need weak reference?
  └─ Rc → Weak<T> (std::rc::Weak)
  └─ Arc → Weak<T> (std::sync::Weak)
```

### Collection selection

Reference: [std::collections — When to use which](https://doc.rust-lang.org/std/collections/index.html#when-should-you-use-which-collection)

| Use case | Type |
|---|---|
| Ordered sequence with index access | `Vec<T>` |
| FIFO queue | `VecDeque<T>` |
| Key-value, unordered | `HashMap<K, V>` |
| Key-value, ordered | `BTreeMap<K, V>` |
| Unique values, unordered | `HashSet<T>` |
| Unique values, ordered | `BTreeSet<T>` |
| Double-ended, mostly front/back | `LinkedList<T>` (rarely; profile first) |
| Small fixed-size heap string | `SmolStr` / `CompactString` (external) |

### Allocation rules

- Prefer stack allocation; move to heap only when required
- Avoid unnecessary `clone()` — model ownership to avoid it
- Pre-allocate with `Vec::with_capacity(n)` when the final size is known
- Use `Cow<'_, str>` / `Cow<'_, [T]>` to avoid allocation on the hot path

### String handling

```rust
// owned, growable
let s: String = String::from("hello");

// borrowed string slice — use in fn args
fn greet(name: &str) { ... }

// string in a static context
const GREETING: &str = "Hello";

// ✓ prefer format! for complex string construction
let msg = format!("User {id} logged in at {timestamp}");

// ✓ push_str / push for incremental building
let mut s = String::with_capacity(64);
s.push_str("prefix-");
s.push_str(suffix);
```

---

## 11. Separation of Concerns

| Layer | Responsibility | Rules |
|---|---|---|
| Data (`struct`, `enum`) | State only | No methods with side effects; derive standard traits |
| Behaviour (`impl`) | Pure logic | No I/O; no global state |
| Interfaces (`trait`) | Contracts only | No logic in default methods unless trivially compositional |
| I/O layer | All side effects | Isolated from domain logic; testable via trait abstraction |
| Entry points (`main`, `bin/`) | Wiring only | Construct, inject, run — no business logic |

Cross-contamination between layers is not allowed. No god structs. No business logic in `main`.

---

## 12. Documentation

Reference: [Rust API Guidelines — Documentation](https://rust-lang.github.io/api-guidelines/documentation.html) · [rustdoc book](https://doc.rust-lang.org/rustdoc/)

### Rules

- Every `pub` item — struct, enum, trait, function, type alias, constant — **must** have a doc comment
- Doc comments use `///` (item-level) and `//!` (module/crate-level)
- First line is a single-sentence summary; blank line before extended description
- Use `# Examples`, `# Errors`, `# Panics`, `# Safety` sections as applicable
- All examples in doc comments must be runnable (`cargo test --doc` must pass)
- `# Errors` documents all variants a function can return
- `# Panics` documents every condition under which a function panics
- `# Safety` is mandatory on every `unsafe fn`

```rust
/// Returns the parsed configuration from the given TOML file.
///
/// The file must be valid UTF-8 and contain a `[server]` section.
///
/// # Errors
///
/// Returns [`ConfigError::NotFound`] if `path` does not exist.
/// Returns [`ConfigError::ParseFailed`] if the file is not valid TOML.
///
/// # Examples
///
/// ```
/// use mylib::Config;
/// use std::path::Path;
///
/// let cfg = Config::from_file(Path::new("config.toml"))?;
/// println!("Listening on port {}", cfg.server.port);
/// # Ok::<(), mylib::ConfigError>(())
/// ```
pub fn from_file(path: &Path) -> Result<Self, ConfigError> { ... }
```

### Code comments — what is allowed

```rust
// ✗ narrates the obvious
// increment counter
counter += 1;

// ✗ restates the code
// check if authenticated
if user.is_authenticated() { ... }

// ✓ safety invariant
// SAFETY: `ptr` is non-null, aligned, and exclusively owned here.

// ✓ non-obvious invariant
// INVARIANT: only reachable after the handshake is complete.

// ✓ upstream workaround
// Workaround: ring 0.17 panics on zero-length input — guard here.
// See: https://github.com/briansmith/ring/issues/9999

// ✓ protocol or hardware quirk
// IEEE 802.3: the preamble byte is always 0x55; strip before parsing.
```

---

## 13. Testing Strategy

Reference: [The Rust Book — ch.11](https://doc.rust-lang.org/book/ch11-00-testing.html)

### Unit tests

- Live in `#[cfg(test)]` modules, directly next to the code under test
- Abstract every external boundary (I/O, network, clock, filesystem) behind a trait
- Test observable behaviour, not internal implementation details

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn email_rejects_missing_at_sign() {
        assert!(EmailAddress::parse("notanemail").is_err());
    }

    #[test]
    fn email_accepts_valid_address() {
        assert!(EmailAddress::parse("user@example.com").is_ok());
    }
}
```

### Integration tests

- Live in `tests/` — each file is its own crate
- Test the public API as a downstream consumer would
- Use `#[tokio::test]` for async integration tests

```rust
// tests/client_test.rs
use mylib::Client;

#[tokio::test]
async fn connect_and_ping() {
    let client = Client::connect("127.0.0.1:8080").await.unwrap();
    assert!(client.ping().await.is_ok());
}
```

### Property-based testing

Use `proptest` or `bolero` for:
- ADT-heavy code with complex state transitions
- Parsers and decoders
- Encoding/decoding round-trips
- Any function where hand-written cases cannot cover the input space

```rust
use proptest::prelude::*;

proptest! {
    #[test]
    fn encode_decode_roundtrip(data: Vec<u8>) {
        let encoded = encode(&data);
        let decoded = decode(&encoded).unwrap();
        prop_assert_eq!(data, decoded);
    }
}
```

### Mocking

- Prefer **hand-written test doubles behind traits** for small interfaces
- Reserve `mockall` for large external surfaces where generating mocks is genuinely faster
- Never use mocking frameworks to work around untestable designs — fix the design

```rust
// ✓ hand-written double
struct FakeClock { now: Instant }

impl Clock for FakeClock {
    fn now(&self) -> Instant { self.now }
}
```

### Benchmarks

- Live in `benches/` using `criterion`
- Benchmark before optimising — assumptions are usually wrong
- Use `black_box` to prevent dead-code elimination

```rust
// benches/encode.rs
use criterion::{black_box, criterion_group, criterion_main, Criterion};

fn bench_encode(c: &mut Criterion) {
    let data = vec![0u8; 1024];
    c.bench_function("encode 1kb", |b| b.iter(|| encode(black_box(&data))));
}

criterion_group!(benches, bench_encode);
criterion_main!(benches);
```

### Quality gates — must all pass before submission

```sh
cargo fmt --check
cargo clippy -- -D warnings
cargo test --all
cargo test --doc
```

Optionally, for production-grade libraries:

```sh
cargo deny check          # license / advisory audit
cargo audit               # security advisories
cargo mutants             # mutation testing
```

---

## 14. Feature Flags

Reference: [Cargo Book — Features](https://doc.rust-lang.org/cargo/reference/features.html)

```toml
[features]
default  = ["std"]
std      = []               # enables std-dependent code; always present unless no_std
async    = ["tokio"]        # opt-in async support
serde    = ["dep:serde"]    # opt-in serialisation
tracing  = ["dep:tracing"]  # opt-in instrumentation
```

**Rules:**
- `default` must be minimal — library consumers should be able to opt out
- Never put a feature behind `default` that requires a heavy transitive dep
- Use `#[cfg(feature = "...")]` to gate code, not `#[cfg(all(...))]` soup
- Document every feature in the crate-level `//!` doc comment

---

## 15. Cargo Profiles & Compilation

Reference: [Cargo Book — Profiles](https://doc.rust-lang.org/cargo/reference/profiles.html)

```toml
[profile.dev]
opt-level    = 0    # fast compilation
debug        = true

[profile.release]
opt-level    = 3
lto          = true
codegen-units = 1   # max optimisation, slower link
strip        = "symbols"
panic        = "abort"  # removes unwinding machinery; smaller binary

[profile.bench]
inherits = "release"
debug    = true     # keep symbols for profiling
```

---

## 16. `no_std` Compatibility

When targeting embedded or bare-metal environments:

```rust
#![no_std]

// If heap allocation is available:
extern crate alloc;
use alloc::vec::Vec;
use alloc::string::String;

// If no heap:
// use fixed-size arrays, heapless crate, or static buffers
```

**Rules:**
- Guard all `std` usage behind `#[cfg(feature = "std")]`
- Implement `core::fmt::Display` rather than `std::fmt::Display` (they are the same trait, but imports should go through `core` in `no_std` code)
- Test `no_std` compatibility in CI with a target like `thumbv7m-none-eabi`

---

## 17. Operating Procedure

### A — Recon (always first)

```sh
cargo metadata --no-deps -q
rg --hidden -n "^pub (fn|struct|enum|trait|type|mod) " -g '!target' src/ || true
rg --hidden -n "#\[cfg\(|unsafe |TODO|FIXME|SAFETY" -g '!target' || true
cat Cargo.toml
```

**Exit criteria:** You can name the 3 most relevant modules to your change.

### B — Plan (write before touching any file)

- Files to modify
- Minimal steps in order
- New or changed types
- New error variants
- New public API surface (if any)
- New dependencies (with justification)

### C — Implement

- Integrate with existing patterns
- No new crates unless unavoidable — justify in the plan
- Keep changes minimal and reviewable

### D — Quality Gates (must all pass)

```sh
cargo fmt
cargo clippy -- -D warnings
cargo test --all --quiet
cargo test --doc
```

### E — Final Deliverables

1. Repo summary (1–3 bullets relevant to the change)
2. Plan (as written in B)
3. Patch (minimal unified diff)
4. Commands and their output
5. Follow-ups (only if strictly necessary)

---

## 18. Final Checklist

Before any submission, every item must be checked:

- [ ] Recon was completed; 3 relevant modules identified
- [ ] `std` / `core` was consulted before reaching for external crates
- [ ] Domain state is modelled with enums; invalid states are unrepresentable
- [ ] Newtypes enforce domain constraints at construction
- [ ] Concerns are cleanly separated: data / behaviour / interface / I/O / entry point
- [ ] All `pub` items have complete doc comments with `# Errors`, `# Panics`, `# Safety` where applicable
- [ ] Doc comment examples compile and pass (`cargo test --doc`)
- [ ] No `unwrap()` / `expect()` outside tests
- [ ] No `panic!` except `unreachable!()` with documented invariant
- [ ] All `unsafe` blocks have a `// SAFETY:` comment
- [ ] No unnecessary comments (no narration of obvious code)
- [ ] No `TODO`, `FIXME`, `XXX`, or commented-out code
- [ ] No placeholders, stubs, or incomplete logic
- [ ] `cargo fmt`, `cargo clippy -D warnings`, `cargo test --all`, `cargo test --doc` all pass
- [ ] The result reflects senior-level, idiomatic Rust

If any answer is **no** — rewrite before submission.

---

**References**

| Resource | URL |
|---|---|
| The Rust Book | https://doc.rust-lang.org/book/ |
| Rust Reference | https://doc.rust-lang.org/reference/ |
| std docs | https://doc.rust-lang.org/std/ |
| Rustonomicon | https://doc.rust-lang.org/nomicon/ |
| Rust API Guidelines | https://rust-lang.github.io/api-guidelines/ |
| Async Book | https://rust-lang.github.io/async-book/ |
| Cargo Book | https://doc.rust-lang.org/cargo/ |
| Edition Guide | https://doc.rust-lang.org/edition-guide/ |
| Clippy Lints | https://rust-lang.github.io/rust-clippy/master/ |
| docs.rs | https://docs.rs/ |
| crates.io | https://crates.io/ |