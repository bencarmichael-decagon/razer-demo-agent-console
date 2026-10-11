// Agent console: polls /api/conversations and renders the selected thread.
const POLL_MS = 2000;

const state = {
  list: [],
  selectedId: new URLSearchParams(location.search).get("id"),
  selected: null,
  busy: false,
  config: {},
};

const $ = (sel) => document.querySelector(sel);

// Display copy of the customer record the call uses (see netlify/functions/trigger-call.mjs).
const CUSTOMER_CONTACT = { name: "Ben", phone: "+1 (415) 347-9671" };

const STATUS_LABEL = { with_human: "With human", with_ai: "Back with AI", closed: "Closed" };

const CONTEXT_FIELDS = [
  ["customer_name", "Customer"],
  ["customer_user_id", "User ID"],
  ["product", "Product"],
  ["model_id", "Model"],
  ["serial_number", "Serial"],
  ["region", "Region"],
  ["warranty_status", "Warranty"],
  ["issue_summary", "Issue"],
  ["evidence_ticket_id", "Evidence ticket"],
  ["resolution_summary", "Resolution"],
];

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

function timeAgo(iso) {
  const s = Math.round((Date.now() - new Date(iso)) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function toast(text, isError = false) {
  const el = $("#toast");
  el.textContent = text;
  el.className = `show${isError ? " error" : ""}`;
  clearTimeout(toast.t);
  toast.t = setTimeout(() => (el.className = ""), 3500);
}

async function api(path, body) {
  const res = await fetch(`/api/${path}`, body
    ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
    : undefined);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

// ---------- rendering ----------

function renderList() {
  const ul = $("#conversation-list");
  $("#count").textContent = state.list.length || "";

  if (!state.list.length) {
    ul.innerHTML = `<li class="empty" style="cursor:default">No escalations yet.<br>They'll appear here when the AI hands a conversation off.</li>`;
    return;
  }

  ul.innerHTML = state.list.map((c) => `
    <li data-id="${escapeHtml(c.id)}" class="${c.id === state.selectedId ? "active" : ""}">
      <div class="conv-top">
        <span class="conv-title">${escapeHtml(c.product || c.customer || c.id)}</span>
        <span class="pill ${c.status}">${STATUS_LABEL[c.status] ?? c.status}</span>
      </div>
      <div class="conv-sub">${escapeHtml(c.lastMessage || "—")}</div>
      <div class="conv-sub">${timeAgo(c.updatedAt)}</div>
    </li>`).join("");
}

function renderAttachments(urls) {
  return (urls || []).map((u) =>
    `<a href="${escapeHtml(u)}" target="_blank" rel="noopener"><img src="${escapeHtml(u)}" alt="attachment"></a>`
  ).join("");
}

// If an attachment can't load as an image (auth-protected, video, etc.), show the link instead.
document.addEventListener("error", (e) => {
  const img = e.target;
  if (img.tagName !== "IMG" || !img.closest("#detail")) return;
  const span = document.createElement("span");
  span.className = "fallback";
  span.textContent = img.parentElement.href;
  img.replaceWith(span);
}, true);

function renderDetail() {
  const c = state.selected;
  const detail = $("#detail");
  if (!c) {
    detail.innerHTML = `<div class="placeholder">${state.selectedId ? "Loading…" : "Select a conversation"}</div>`;
    return;
  }

  const withHuman = c.status === "with_human";
  const ctx = c.context || {};
  const photos = ctx.evidence_photo_urls || [];

  // Preserve whatever the agent is typing across re-renders.
  const draft = $("#reply-text")?.value ?? "";
  const notesDraft = $("#review-notes")?.value ?? "";
  const closeDraft = $("#closing-message")?.value ?? "";
  const threadEl = $("#thread");
  const atBottom = !threadEl || threadEl.scrollHeight - threadEl.scrollTop - threadEl.clientHeight < 40;

  detail.innerHTML = `
    <div class="thread-col">
      <div class="detail-head">
        <strong>${escapeHtml(ctx.customer_name || ctx.customer_user_id || "Customer")}</strong>
        <span class="pill ${c.status}">${STATUS_LABEL[c.status] ?? c.status}</span>
        <span class="id">${escapeHtml(c.id)}</span>
      </div>
      <div id="thread">
        ${c.messages.map((m) => {
          // No whitespace inside the bubble: .msg uses white-space: pre-wrap.
          const meta = m.role === "system" ? "" : `<div class="meta">${m.role === "agent" ? "You" : "Customer"} · ${timeAgo(m.at)}</div>`;
          return `<div class="msg ${m.role}">${meta}${escapeHtml(m.text)}${renderAttachments(m.attachments)}</div>`;
        }).join("")}
      </div>
      <form class="composer" id="reply-form">
        <textarea id="reply-text" placeholder="${withHuman ? "Reply to the customer…" : "Conversation is no longer with a human"}" ${withHuman ? "" : "disabled"}></textarea>
        <button class="primary" type="submit" ${withHuman ? "" : "disabled"}>Send</button>
      </form>
    </div>

    <div class="context-col">
      <section>
        <h3>Case details</h3>
        <dl class="kv">
          ${CONTEXT_FIELDS.filter(([k]) => ctx[k]).map(([k, label]) =>
            `<dt>${label}</dt><dd>${escapeHtml(ctx[k])}</dd>`).join("") || `<dd class="hint">No context received</dd>`}
        </dl>
      </section>

      ${photos.length ? `
      <section>
        <h3>Destruction evidence</h3>
        <div class="evidence">${renderAttachments(photos)}</div>
      </section>` : ""}

      ${ctx.transcript_summary ? `
      <section>
        <h3>AI summary</h3>
        <div class="hint" style="white-space:pre-wrap">${escapeHtml(ctx.transcript_summary)}</div>
      </section>` : ""}

      <section>
        <h3>Review</h3>
        <div class="actions">
          <textarea id="review-notes" placeholder="Reviewer notes (optional)" ${withHuman ? "" : "disabled"}></textarea>
          <button class="primary" id="approve" ${withHuman ? "" : "disabled"}>Approve &amp; hand back to AI</button>
          <span class="hint">The AI resumes and completes the replacement.</span>
        </div>
      </section>

      <section>
        <h3>Customer contact</h3>
        <dl class="kv" style="margin-bottom:10px">
          <dt>Name</dt><dd>${escapeHtml(CUSTOMER_CONTACT.name)}</dd>
          <dt>Phone</dt><dd>${escapeHtml(CUSTOMER_CONTACT.phone)}</dd>
          <dt>Preferred</dt><dd>Phone call</dd>
        </dl>
        <div class="actions">
          <button class="primary" id="call" ${state.config.outboundConfigured ? "" : "disabled"}>Call customer to complete replacement</button>
          <span class="hint">${state.config.outboundConfigured
            ? "The AI calls, confirms the approval and delivery address, and creates the order."
            : "Set OUTBOUND_MISSION_ID in Netlify to enable."}</span>
        </div>
      </section>

      <section>
        <h3>Resolve</h3>
        <div class="actions">
          <textarea id="closing-message" placeholder="Closing message to customer (optional — uses the default if blank)" ${c.status === "closed" ? "disabled" : ""}></textarea>
          <button id="close" ${c.status === "closed" ? "disabled" : ""}>Resolve &amp; close conversation</button>
        </div>
      </section>
    </div>`;

  $("#reply-text").value = draft;
  $("#review-notes").value = notesDraft;
  $("#closing-message").value = closeDraft;
  const t = $("#thread");
  if (atBottom) t.scrollTop = t.scrollHeight;
}

// ---------- data ----------

async function refresh() {
  try {
    state.list = await api("conversations");
    renderList();
    if (state.selectedId) {
      const next = await api(`conversations?id=${encodeURIComponent(state.selectedId)}`).catch(() => null);
      // Only re-render when something changed, so typing and scrolling aren't disturbed.
      if (JSON.stringify(next) !== JSON.stringify(state.selected)) {
        state.selected = next;
        renderDetail();
      }
    }
  } catch (err) {
    console.error(err);
  }
}

function select(id) {
  state.selectedId = id;
  state.selected = null;
  history.replaceState(null, "", id ? `?id=${encodeURIComponent(id)}` : location.pathname);
  renderList();
  renderDetail();
  refresh();
}

async function act(fn, success) {
  if (state.busy) return;
  state.busy = true;
  try {
    const res = await fn();
    toast(res.sent === false ? `${success} (local only — not sent to Decagon)` : success);
    await refresh();
    return true;
  } catch (err) {
    toast(err.message, true);
    return false;
  } finally {
    state.busy = false;
  }
}

// ---------- events ----------

$("#conversation-list").addEventListener("click", (e) => {
  const li = e.target.closest("li[data-id]");
  if (li) select(li.dataset.id);
});

$("#detail").addEventListener("submit", async (e) => {
  if (e.target.id !== "reply-form") return;
  e.preventDefault();
  const input = $("#reply-text");
  const text = input.value.trim();
  if (!text) return;
  input.value = "";
  const ok = await act(() => api("reply", { conversation_id: state.selectedId, text }), "Reply sent");
  if (!ok) input.value = text;
});

$("#detail").addEventListener("keydown", (e) => {
  if (e.target.id === "reply-text" && e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    $("#reply-form").requestSubmit();
  }
});

$("#detail").addEventListener("click", (e) => {
  if (e.target.id === "approve") {
    const notes = $("#review-notes").value;
    act(() => api("approve", { conversation_id: state.selectedId, reviewer_notes: notes }), "Approved — AI is taking over");
  }
  if (e.target.id === "call") {
    act(() => api("trigger-call", { conversation_id: state.selectedId }), `Calling ${CUSTOMER_CONTACT.name}…`);
  }
  if (e.target.id === "close") {
    const closing = $("#closing-message").value;
    act(() => api("close", { conversation_id: state.selectedId, closing_message: closing }), "Conversation closed");
  }
});

$("#reset").addEventListener("click", async () => {
  if (!confirm("Delete all stored conversations? This only clears this console, not Decagon.")) return;
  const ok = await act(() => api("reset", {}), "Cleared");
  if (ok) select(null);
});

// ---------- boot ----------

api("status").then((s) => {
  state.config = s;
  renderDetail();
  const el = $("#connection");
  el.textContent = s.decagonConnected ? "Connected to Decagon AU" : "Local only — Decagon not configured";
  el.className = `pill ${s.decagonConnected ? "ok" : "warn"}`;
  el.title = s.baseUrl;
}).catch(() => {});

renderDetail();
refresh();
setInterval(() => { if (document.visibilityState === "visible") refresh(); }, POLL_MS);
