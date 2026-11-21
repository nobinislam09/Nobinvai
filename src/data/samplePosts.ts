import { BlogPost } from '../types/blog';
import { calculateReadingTime } from '../utils/blogHelpers';

/**
 * Default curated sample posts loaded on first visit.
 * Users can edit, unpublish, delete, or replace these anytime in /admin.
 */
const RAW_SAMPLE_POSTS: Omit<BlogPost, 'readingTimeMinutes'>[] = [
  {
    id: 'post-local-inference-bottlenecks',
    slug: 'running-frontier-class-models-locally-what-actually-bottlenecks-your-desk-setup',
    title: 'Running Frontier-Class Models Locally: What Actually Bottlenecks Your Desk Setup',
    excerpt:
      'Why memory bandwidth—not raw FLOPS—governs token generation speed on a desktop workstation, and how smart quantization changes the math for everyday engineering workflows.',
    category: 'AI & Tools',
    tags: ['Local LLMs', 'Hardware', 'Quantization', 'Inference'],
    coverImage: '/src/assets/images/cover_local_llm_workstation_1795282170678.jpg',
    coverCaption: 'A quiet single-workstation inference rig tuned for long-context code review and offline drafting.',
    author: 'Elena Vance',
    publishedAt: '2026-11-18',
    updatedAt: '2026-11-18T10:00:00.000Z',
    status: 'published',
    featured: true,
    content: `When engineers build a desk machine for running open-weight language models locally, the first instinct is almost always to chase peak tensor FLOPS. On paper, that makes intuitive sense—graphics cards are marketed by compute throughput. Yet the moment you open a terminal and stream tokens from a 32B or 70B parameter model, you discover a very different physical constraint.

Autoregressive decoding is overwhelmingly **memory-bandwidth bound**. Every single generated token requires the GPU or unified memory controller to read the active model weights from VRAM into compute registers, perform a modest amount of arithmetic, and write the updated key-value cache back out.

> Hardware doesn't stall because it cannot multiply matrices fast enough; it stalls waiting for billions of weights to cross the memory bus for a single word.

## Measuring the Real Constraint

If a card delivers 1,000 GB/s of memory bandwidth and you load a 20 GB quantized model, your theoretical ceiling sits near 50 tokens per second before accounting for attention overhead or KV cache reads. Doubling compute cores without widening the memory bus barely moves the needle during single-stream interactive chat.

> [!NOTE]
> Prompt ingestion (prefill) *is* compute-bound because thousands of input tokens are processed in parallel. Generation (decode) is bandwidth-bound because tokens emerge one at a time.

You can estimate your practical VRAM budget—including context window overhead—with a quick calculation before downloading multi-gigabyte weight files:

\`\`\`typescript
interface ModelMemoryBudget {
  parametersBillions: number;
  bitsPerWeight: number;
  contextTokens: number;
  layers: number;
  kvHeads: number;
  headDim: number;
}

export function estimateVramGigabytes(spec: ModelMemoryBudget): number {
  const weightsGb = (spec.parametersBillions * spec.bitsPerWeight) / 8;
  // 2 tensors (Key + Value) at fp16 (2 bytes) per token across all layers
  const kvBytesPerToken = 2 * spec.layers * spec.kvHeads * spec.headDim * 2;
  const kvCacheGb = (kvBytesPerToken * spec.contextTokens) / 1e9;
  const runtimeOverheadGb = 1.2;

  return Number((weightsGb + kvCacheGb + runtimeOverheadGb).toFixed(2));
}
\`\`\`

## Quantization Without Losing Reasoning Quality

In day-to-day code navigation, summarization, and structured extraction, dropping from 16-bit floats down to 4-bit or 5-bit mixed quantization (\`Q4_K_M\` or \`Q5_K_M\`) recovers more than 65% of memory footprint while preserving nearly all instruction-following accuracy. The key is leaving sensitive attention and output projection layers at higher precision.

- **Use 4-bit medium mixed precision** when fitting a 32B-class model comfortably inside a 24 GB card alongside a 32k context window.
- **Keep KV cache at FP16 or Q8_0** if your workload involves long-context refactoring, where subtle retrieval drift hurts more than slightly slower throughput.
- **Batch background evaluations** so your GPU shifts back into the compute-bound regime rather than idling on single-token memory fetches.

> [!TIP]
> Before upgrading GPUs, benchmark your actual workload with quantized KV cache enabled and flash attention turned on—most desktop bottlenecks vanish once unnecessary memory copies are eliminated.

A well-tuned local workstation does not need datacenter wattage. Quiet thermals, unified or high-bandwidth VRAM, and disciplined quantization turn offline models into dependable everyday tools.`,
  },
  {
    id: 'post-idempotent-webhooks',
    slug: 'designing-idempotent-webhook-pipelines-that-survive-partial-failures',
    title: 'Designing Idempotent Webhook Pipelines That Survive Partial Failures',
    excerpt:
      'Networks drop packets, payment providers retry aggressively, and workers crash mid-flight. Here is a resilient pattern combining inbox deduplication with transactional outboxes.',
    category: 'Software',
    tags: ['Distributed Systems', 'TypeScript', 'Reliability', 'Backend'],
    coverImage: '/src/assets/images/cover_distributed_systems_1795282170299.jpg',
    coverCaption: 'Deterministic routing and explicit state transitions prevent silent duplicate side effects.',
    author: 'Marcus Lindqvist',
    publishedAt: '2026-11-12',
    updatedAt: '2026-11-12T15:30:00.000Z',
    status: 'published',
    featured: false,
    content: `Every production integration eventually learns the same lesson: **at-least-once delivery** means you *will* receive the same webhook event twice—often concurrently, sometimes hours apart, and occasionally out of order. If your handler trusts HTTP request boundaries as transaction boundaries, duplicate invoices and corrupted state machines are only a matter of time.

Building an idempotent pipeline is less about clever retry loops and more about separating *receipt* from *execution*.

## Step 1: Acknowledge Fast, Persist Durably

Your HTTP ingress endpoint has only three jobs: verify the cryptographic signature, write the raw event into an inbox table keyed by the provider's unique event ID, and return \`200 OK\`. Never run downstream billing logic, third-party API calls, or email notifications inside the webhook request handler itself.

\`\`\`typescript
interface WebhookEnvelope {
  eventId: string;
  eventType: string;
  payload: unknown;
  receivedAt: string;
}

export async function ingestWebhook(
  db: DatabaseClient,
  envelope: WebhookEnvelope
): Promise<'accepted' | 'duplicate'> {
  const inserted = await db.queryOne<{ id: string }>(
    \`INSERT INTO webhook_inbox (event_id, event_type, payload, status)
     VALUES ($1, $2, $3, 'pending')
     ON CONFLICT (event_id) DO NOTHING
     RETURNING event_id AS id\`,
    [envelope.eventId, envelope.eventType, JSON.stringify(envelope.payload)]
  );

  return inserted ? 'accepted' : 'duplicate';
}
\`\`\`

Notice how \`ON CONFLICT (event_id) DO NOTHING\` turns concurrent duplicate deliveries into a harmless no-op at the database constraint layer. There is no race window between a \`SELECT\` check and a subsequent \`INSERT\`.

## Step 2: Guard Against Out-of-Order Events

Deduplicating by \`event_id\` prevents identical replays, yet providers can still deliver \`subscription.canceled\` before \`subscription.updated\` if two separate events cross paths in transit. Pair inbox deduplication with a monotonic timestamp or sequence version check on the target entity.

1. Store \`last_processed_event_at\` on the domain record you are mutating.
2. Wrap the domain update and the inbox row status transition (\`pending\` -> \`processed\`) inside a single database transaction.
3. Reject or archive stale state transitions whose source timestamp predates the record's latest committed state.

> [!WARNING]
> Never mark an inbox event as \`processed\` before committing its domain side effects—and never fire external HTTP calls inside an open database transaction where lock contention can stall your connection pool.

## Step 3: Exponential Backoff With Full Jitter

When a downstream worker retries failed jobs, synchronized retry waves can hammer an already degraded dependency. Adding randomized full jitter spreads recovery load evenly across time while keeping total latency predictable.

Reliable systems rarely depend on exotic infrastructure. A unique constraint, a single transaction boundary, and disciplined separation between ingress and work execution solve ninety percent of webhook reliability failures.`,
  },
  {
    id: 'post-epaper-field-report',
    slug: 'six-months-with-monochrome-e-paper-a-field-report-on-distraction-free-hardware',
    title: 'Six Months With Monochrome E-Paper: A Field Report on Distraction-Free Hardware',
    excerpt:
      'Stripping away color, notifications, and 120Hz glass reveals what modern computing actually owes us—and where reflective displays still ask for deliberate patience.',
    category: 'Gadgets',
    tags: ['Hardware', 'E-Paper', 'Ergonomics', 'Field Report'],
    coverImage: '/src/assets/images/cover_epaper_hardware_1795282170539.jpg',
    coverCaption: 'Reflective monochrome displays thrive under natural daylight without emitting glare.',
    author: 'Sora Takahashi',
    publishedAt: '2026-11-05',
    updatedAt: '2026-11-05T09:15:00.000Z',
    status: 'published',
    featured: false,
    content: `Most modern portable hardware competes on sensory abundance: OLED panels pushing over a thousand nits, haptic motors, and operating systems engineered to surface every incoming message within milliseconds. Six months ago, I moved my architecture sketching, technical paper reading, and morning drafting onto a monochrome e-paper tablet to test the opposite thesis.

What happens when a computer refuses to glow, buzz, or multitask?

## The Ergonomics of Reflected Light

Working beside a sunlit window on a conventional glossy laptop forces a constant brightness arms race. On an electrophoretic display, ambient daylight *is* the light source. Reading forty-page RFCs or reviewing long design documents feels closer to holding printed cardstock than staring into a backlit lamp, eliminating late-evening eye strain almost entirely.

> A quiet screen changes your posture toward thought: you stop skimming for novelty and start reading to finish.

## Tactile Craft and Physical Input

Hardware longevity lives in small mechanical tolerances—the friction coefficient of a nib on etched glass, the crisp travel of a tactile switch, and the absence of creaking plastic seams. Just as custom mechanical keyboards endure because every spring, stem, and brass plate is serviceable, purpose-built writing hardware earns trust through restraint.

![Overhead flat-lay of disassembled mechanical switches, brass mounting plate, and black PCB](/src/assets/images/inline_hardware_teardown_1795282171731.jpg)

Evaluating input hardware side by side makes one distinction clear: latency under 20 milliseconds feels instantaneous to the hand, even on a monochrome panel, whereas scrolling dense web pages remains sluggish because e-ink microcapsules physically reposition pigment particles.

- **Best suited for:** Long-form PDFs, handwritten system diagrams, quiet outline drafting, and code review notes.
- **Poorly suited for:** Rapid spreadsheet scanning, syntax-highlighted multi-pane IDEs, or motion-heavy interfaces.
- **Battery reality:** Three weeks of daily sketching between USB-C charges changes how you pack for travel.

> [!TIP]
> Pair a monochrome reading slate with plain Markdown or PDF synchronization over local Wi-Fi rather than proprietary cloud lock-in so your notes remain portable decades from now.

Distraction-free gadgets will never replace a primary workstation, nor should they try. As a dedicated thinking surface, however, slower hardware gives your attention room to settle.`,
  },
  {
    id: 'post-exhaustive-typescript-matching',
    slug: 'a-practical-guide-to-exhaustive-pattern-matching-in-strict-typescript',
    title: 'A Practical Guide to Exhaustive Pattern Matching in Strict TypeScript',
    excerpt:
      'Using discriminated unions and the never type to turn missing state-machine branches into immediate compile-time guarantees across large frontend and API codebases.',
    category: 'Guides',
    tags: ['TypeScript', 'Type Safety', 'Architecture', 'Clean Code'],
    coverImage: '/src/assets/images/cover_typescript_patterns_1795282170891.jpg',
    coverCaption: 'Encoding domain invariants directly in the type system eliminates entire classes of defensive runtime checks.',
    author: 'Elena Vance',
    publishedAt: '2026-10-27',
    updatedAt: '2026-10-27T14:20:00.000Z',
    status: 'published',
    featured: false,
    content: `Boolean flags proliferate quietly. A loading state starts with \`isLoading: boolean\`, gains \`hasError: boolean\`, adds \`isRetrying: boolean\`, and before long your component permits eight theoretical combinations when only four actually exist in reality.

Discriminated unions replace ambiguous booleans with mutually exclusive states, and pairing them with an exhaustiveness helper guarantees the compiler catches every forgotten branch whenever requirements evolve.

## Modeling States Explicitly

Instead of spreading optional properties across a flat object, model each lifecycle phase as its own tagged variant sharing a common \`kind\` or \`status\` literal:

\`\`\`typescript
type SyncState<T> =
  | { status: 'idle' }
  | { status: 'loading'; startedAt: number }
  | { status: 'success'; data: T; syncedAt: string }
  | { status: 'error'; message: string; retryable: boolean };

function assertNever(value: never): never {
  throw new Error(\`Unhandled discriminated union member: \${JSON.stringify(value)}\`);
}
\`\`\`

With \`assertNever\` placed in the \`default\` branch of a \`switch\` statement, TypeScript narrows every handled case away until only \`never\` remains.

## Putting Exhaustiveness to Work

Consider rendering a status banner or mapping a server response to an HTTP status code. The moment a teammate adds \`{ status: 'conflict'; serverVersion: number }\` to the union, every unhandled \`switch\` statement across the entire repository lights up in the compiler immediately.

\`\`\`typescript
export function formatSyncSummary<T>(state: SyncState<T>): string {
  switch (state.status) {
    case 'idle':
      return 'Ready to synchronize';
    case 'loading':
      return 'Synchronizing records...';
    case 'success':
      return \`Last synced at \${state.syncedAt}\`;
    case 'error':
      return state.retryable
        ? \`Temporary error: \${state.message}\`
        : \`Sync halted: \${state.message}\`;
    default:
      return assertNever(state);
  }
}
\`\`\`

> [!NOTE]
> Avoid adding fallback \`return ''\` statements at the bottom of discriminated switches—doing so silences the compiler and reintroduces silent runtime bugs.

## Three Habits That Keep Unions Clean

- **Avoid catch-all optional fields** on the shared base interface; attach payload fields strictly to the variant where they are guaranteed to exist.
- **Keep discriminant names consistent** across modules (such as \`status\` for async workflows and \`type\` for domain events).
- **Prefer small helper functions** over deeply nested ternary chains in JSX so exhaustiveness checks stay readable during code reviews.

Strict TypeScript pays its highest dividends six months after initial launch—when a new state enters a mature codebase and the compiler points straight to every line that needs your attention.`,
  },
];

export const SAMPLE_POSTS: BlogPost[] = RAW_SAMPLE_POSTS.map((post) => ({
  ...post,
  readingTimeMinutes: calculateReadingTime(post.content),
}));
