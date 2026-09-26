/**
 * SENTINEL AI — INCIDENT COMMAND CENTER CORE LOGIC
 * Real-time incident intelligence, log evidence correlation,
 * deterministic AI root-cause analysis, and telemetry stream generator.
 */

// Initial Seed Data (Production-Grade Scenarios)
let incidents = [
  {
    id: 1042,
    title: "PostgreSQL Connection Saturation in payments-api",
    service: "payments-api",
    severity: "critical",
    status: "open",
    description: "Checkout throughput dropped by 84%. Connection pool exhaustion detected across worker instances attempting to acquire PostgreSQL transactions.",
    logs: `[2026-09-26 14:42:01] [FATAL] remaining connection slots are reserved for non-replication superuser connections (client: 10.244.2.18)
[2026-09-26 14:42:02] [ERROR] pool.acquire() timed out after 30000ms: max_pool_size=100 reached across 4 worker replicas
[2026-09-26 14:42:03] [WARN] circuit breaker tripped: postgres-cluster marked UNHEALTHY
[2026-09-26 14:42:05] [ERROR] HTTP 500 Internal Server Error returned on 892 /v1/charges requests`,
    created_at: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
    ai_summary: null,
    ai_root_cause: null,
    ai_recommendations: null,
    ai_confidence: null
  },
  {
    id: 1041,
    title: "OOM Heap Memory Exceeded in notification-worker",
    service: "notification-worker",
    severity: "high",
    status: "investigating",
    description: "Worker container abruptly terminated during massive monthly batch invoice generation. Pod restart loop observed.",
    logs: `[2026-09-26 13:10:15] [WARN] JVM heap consumption at 94.8% (3.8GB / 4.0GB allocated)
[2026-09-26 13:10:18] [ERROR] java.lang.OutOfMemoryError: Java heap space during batch PDF rendering task #8194
[2026-09-26 13:10:19] [FATAL] Kubelet terminated container notification-worker-7c89f with exit code 137 (OOMKilled)
[2026-09-26 13:10:25] [INFO] Container restarted with backoff delay: 10s`,
    created_at: new Date(Date.now() - 85 * 60 * 1000).toISOString(),
    ai_summary: null,
    ai_root_cause: null,
    ai_recommendations: null,
    ai_confidence: null
  },
  {
    id: 1040,
    title: "504 Gateway Timeout Cascade on Ingress Gateway",
    service: "ingress-gateway",
    severity: "high",
    status: "mitigated",
    description: "Downstream latency spike in auth-service caused request backpressure across Nginx edge proxies.",
    logs: `[2026-09-26 11:22:40] [WARN] client 198.51.100.44 slow response on POST /api/v1/auth/token
[2026-09-26 11:22:50] [ERROR] upstream request timeout after 30000ms while connecting to auth-service:8080
[2026-09-26 11:22:51] [ERROR] 504 Gateway Timeout emitted on 1,420 downstream customer requests
[2026-09-26 11:24:10] [INFO] Autoscaled auth-service replicas from 2 to 6; latency normalized`,
    created_at: new Date(Date.now() - 210 * 60 * 1000).toISOString(),
    ai_summary: null,
    ai_root_cause: null,
    ai_recommendations: null,
    ai_confidence: null
  },
  {
    id: 1039,
    title: "Redis Cache Thundering Herd on User Session Lookups",
    service: "session-cache",
    severity: "medium",
    status: "resolved",
    description: "Session token TTL expiration synchronized at midnight caused 15,000 concurrent cache misses into database.",
    logs: `[2026-09-26 09:14:02] [WARN] cache miss rate surged to 88% on key pattern session:*
[2026-09-26 09:14:03] [WARN] database queries per second doubled from 2,100 to 4,800
[2026-09-26 09:15:30] [INFO] Applied probabilistic jitter to session TTLs; hit rate restored to 99.2%`,
    created_at: new Date(Date.now() - 360 * 60 * 1000).toISOString(),
    ai_summary: "Midnight key expiration without TTL jitter triggered a thundering herd storm.",
    ai_root_cause: "Synchronous key TTL expiration causing database read spikes.",
    ai_recommendations: ["Ensure all cache TTLs incorporate randomized expiration offsets.", "Enable cache-aside read locks for high-demand session keys."],
    ai_confidence: "92%"
  }
];

let selectedIncidentId = 1042;
let currentFilter = 'all';
let currentSearch = '';
let isTelemetryStreaming = true;

// ERROR SIGNATURES matching Python AI Service (ai_service/app/main.py)
const ERROR_PATTERNS = {
  database: {
    regex: /timeout|deadlock|connection refused|too many connections|postgres|mysql|pool\.acquire/i,
    cause: "Database connectivity bottleneck, transaction lock, or connection pool saturation.",
    recommendations: [
      "Check database connection pool usage (PgBouncer / Prisma / HikariCP) and tune max_connections.",
      "Inspect pg_stat_activity for unindexed slow queries or table deadlocks.",
      "Verify connection keepalive and idle timeout settings across worker replicas.",
      "Deploy read replicas to offload read-heavy reporting queries."
    ]
  },
  memory: {
    regex: /out of memory|oom|heap|memory limit|killed|exit code 137/i,
    cause: "Severe heap exhaustion, memory leak, or container cgroup limit breach.",
    recommendations: [
      "Analyze heap profile dumps for uncollected memory buffers or unbounded in-memory caches.",
      "Increase Kubernetes memory request/limit bounds to prevent OOMKilled evictions.",
      "Paginate large batch processing tasks to stream data rather than holding entire datasets in RAM.",
      "Enable proactive GC monitoring and alerts before threshold reaches 90%."
    ]
  },
  latency: {
    regex: /latency|slow|timed out|504|gateway timeout|upstream request timeout/i,
    cause: "Downstream microservice response degradation causing edge backpressure and timeout cascades.",
    recommendations: [
      "Check upstream network latency and internal RPC response percentiles (p95 / p99).",
      "Configure aggressive circuit breakers to fail-fast rather than holding threads open.",
      "Autoscale replica pods for the congested downstream dependency.",
      "Review rate limiting and shed non-critical background workloads."
    ]
  },
  auth: {
    regex: /401|403|unauthorized|forbidden|token expired|signature/i,
    cause: "Authentication failure, expired signing keys, or misconfigured IAM/CORS roles.",
    recommendations: [
      "Verify public key distribution and JWT token expiration clocks across clusters.",
      "Check OAuth2 / SSO identity provider status and webhook health.",
      "Inspect API gateway header forwarding for missing Bearer tokens."
    ]
  }
};

document.addEventListener('DOMContentLoaded', () => {
  renderIncidents();
  renderSelectedIncident();
  updateMetrics();
  initEventListeners();
  initSentinelAuth();
  startSyntheticTelemetry();
});

/* --------------------------------------------------------------------------
   Render Functions
   -------------------------------------------------------------------------- */
function renderIncidents() {
  const container = document.getElementById('incident-list-container');
  if (!container) return;

  container.innerHTML = '';

  const filtered = incidents.filter(inc => {
    const matchSev = currentFilter === 'all' || inc.severity === currentFilter;
    const matchSearch = inc.title.toLowerCase().includes(currentSearch) ||
      inc.service.toLowerCase().includes(currentSearch) ||
      inc.description.toLowerCase().includes(currentSearch);
    return matchSev && matchSearch;
  });

  if (filtered.length === 0) {
    container.innerHTML = `<div style="padding: 30px; text-align: center; color: var(--text-dim); font-size: 0.85rem;">No incidents match your filter.</div>`;
    return;
  }

  filtered.forEach(inc => {
    const row = document.createElement('div');
    row.className = `incident-row ${inc.id === selectedIncidentId ? 'selected' : ''}`;
    row.onclick = () => {
      selectedIncidentId = inc.id;
      renderIncidents();
      renderSelectedIncident();
    };

    const timeAgo = formatTimeAgo(new Date(inc.created_at));

    row.innerHTML = `
      <span class="sev-badge sev-${inc.severity}">${inc.severity}</span>
      <div class="row-body">
        <div class="row-title">${escapeHtml(inc.title)}</div>
        <div class="row-meta">
          <span>${escapeHtml(inc.service)}</span> &bull; 
          <span>${timeAgo}</span>
        </div>
      </div>
      <span class="status-tag status-${inc.status}">${inc.status}</span>
    `;
    container.appendChild(row);
  });
}

function renderSelectedIncident() {
  const inc = incidents.find(i => i.id === selectedIncidentId);
  const container = document.getElementById('investigation-container');
  if (!container) return;

  if (!inc) {
    container.innerHTML = `<div style="padding: 40px; text-align: center; color: var(--text-dim);">Select an incident from the feed to begin investigation.</div>`;
    return;
  }

  const aiSection = inc.ai_summary ? `
    <div class="ai-investigation-card">
      <div class="ai-card-top">
        <div class="ai-card-title">🤖 SentinelAI Diagnostic Findings</div>
        <span class="ai-confidence-pill">Confidence: ${inc.ai_confidence || '94%'}</span>
      </div>
      <div>
        <div class="ai-field-label">Executive Incident Summary</div>
        <div class="ai-field-val">${escapeHtml(inc.ai_summary)}</div>
      </div>
      <div>
        <div class="ai-field-label">Correlated Root Cause (RCA)</div>
        <div class="ai-field-val" style="color: #38bdf8; font-weight: 600;">${escapeHtml(inc.ai_root_cause)}</div>
      </div>
      <div>
        <div class="ai-field-label">Targeted Actionable Remediation</div>
        <ul class="ai-recommendations-list">
          ${inc.ai_recommendations.map(r => `<li>${escapeHtml(r)}</li>`).join('')}
        </ul>
      </div>
    </div>
  ` : `
    <div class="ai-investigation-card" style="border-style: dashed; background: rgba(255,255,255,0.02);">
      <div class="ai-card-top">
        <div class="ai-card-title">🤖 SentinelAI Automated Investigation</div>
      </div>
      <p style="font-size: 0.88rem; color: var(--text-muted);">
        Run deterministic incident intelligence to parse attached telemetry logs, isolate error signatures, and synthesize immediate remediation runbooks.
      </p>
      <button class="btn btn-primary btn-sm" id="run-ai-btn" style="align-self: flex-start;">
        Analyze with SentinelAI ⚡
      </button>
    </div>
  `;

  // Syntax highlight error lines in log
  const logLines = inc.logs.split('\n').map(line => {
    if (line.includes('[FATAL]') || line.includes('[ERROR]')) {
      return `<span class="log-highlight-err">${escapeHtml(line)}</span>`;
    }
    return escapeHtml(line);
  }).join('\n');

  container.innerHTML = `
    <div class="investigation-header-block">
      <div>
        <div class="inv-id">INCIDENT #${inc.id} &bull; ${escapeHtml(inc.service.toUpperCase())}</div>
        <h3 class="inv-title">${escapeHtml(inc.title)}</h3>
        <p class="inv-desc">${escapeHtml(inc.description)}</p>
      </div>

      <div class="status-dropdown-wrap">
        <label style="font-size: 0.72rem; color: var(--text-dim); display: block; margin-bottom: 3px;">STATUS</label>
        <select id="status-selector">
          <option value="open" ${inc.status === 'open' ? 'selected' : ''}>Open</option>
          <option value="investigating" ${inc.status === 'investigating' ? 'selected' : ''}>Investigating</option>
          <option value="mitigated" ${inc.status === 'mitigated' ? 'selected' : ''}>Mitigated</option>
          <option value="resolved" ${inc.status === 'resolved' ? 'selected' : ''}>Resolved</option>
        </select>
      </div>
    </div>

    <div class="meta-chips-row">
      <div class="meta-chip">Service: <strong>${escapeHtml(inc.service)}</strong></div>
      <div class="meta-chip">Severity: <strong>${escapeHtml(inc.severity.toUpperCase())}</strong></div>
      <div class="meta-chip">Reported: <strong>${new Date(inc.created_at).toLocaleTimeString()}</strong></div>
    </div>

    <div class="log-evidence-section">
      <h4>📑 Attached Telemetry Log Stream</h4>
      <pre class="log-box">${logLines}</pre>
    </div>

    ${aiSection}
  `;

  // Bind AI button
  const aiBtn = document.getElementById('run-ai-btn');
  if (aiBtn) {
    aiBtn.addEventListener('click', () => runAIAnalysis(inc.id));
  }

  // Bind status selector
  const statusSel = document.getElementById('status-selector');
  if (statusSel) {
    statusSel.addEventListener('change', (e) => {
      inc.status = e.target.value;
      updateMetrics();
      renderIncidents();
      showToast(`Incident #${inc.id} marked as ${inc.status.toUpperCase()}`);
    });
  }
}

function updateMetrics() {
  const totalElem = document.getElementById('metric-total');
  const openElem = document.getElementById('metric-open');
  const critElem = document.getElementById('metric-critical');
  const mttrElem = document.getElementById('metric-mttr');

  const total = incidents.length;
  const open = incidents.filter(i => i.status !== 'resolved').length;
  const critical = incidents.filter(i => i.severity === 'critical' && i.status !== 'resolved').length;

  if (totalElem) totalElem.textContent = total;
  if (openElem) openElem.textContent = open;
  if (critElem) critElem.textContent = critical;
  if (mttrElem) mttrElem.textContent = '14.2m';
}

/* --------------------------------------------------------------------------
   AI Investigation Engine (Matching Python ai_service logic)
   -------------------------------------------------------------------------- */
function runAIAnalysis(incidentId) {
  const inc = incidents.find(i => i.id === incidentId);
  if (!inc) return;

  const btn = document.getElementById('run-ai-btn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Executing Neural Pattern Match... ⚡';
  }

  setTimeout(() => {
    const text = `${inc.title} ${inc.description} ${inc.logs}`.toLowerCase();
    let matchedCategory = null;

    for (const [cat, data] of Object.entries(ERROR_PATTERNS)) {
      if (data.regex.test(text)) {
        matchedCategory = { cat, ...data };
        break;
      }
    }

    if (matchedCategory) {
      inc.ai_root_cause = matchedCategory.cause;
      inc.ai_summary = `Automated analysis isolates a signature associated with ${matchedCategory.cat.toUpperCase()} distress in ${inc.service}. High probability of upstream resource starvation.`;
      inc.ai_recommendations = matchedCategory.recommendations;
      inc.ai_confidence = "94%";
    } else {
      inc.ai_root_cause = "Insufficient diagnostic pattern match. Correlate container heap metrics with ingress traffic.";
      inc.ai_summary = `Incident detected in ${inc.service}. General telemetry degradation observed without clear signature.`;
      inc.ai_recommendations = [
        "Check deployment timelines for recent canary updates.",
        "Inspect container CPU and RAM saturation metrics.",
        "Review edge reverse proxy connection logs."
      ];
      inc.ai_confidence = "72%";
    }

    if (inc.status === 'open') inc.status = 'investigating';

    renderIncidents();
    renderSelectedIncident();
    updateMetrics();
    showToast(`AI Investigation complete for Incident #${inc.id}!`);
  }, 700);
}

/* --------------------------------------------------------------------------
   Event Listeners & Modal Controls
   -------------------------------------------------------------------------- */
function initEventListeners() {
  // Severity filter chips
  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentFilter = chip.getAttribute('data-sev');
      renderIncidents();
    });
  });

  // Search input
  const searchInput = document.getElementById('feed-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentSearch = e.target.value.toLowerCase().trim();
      renderIncidents();
    });
  }

  // Create Incident Modal
  const openModalBtn = document.getElementById('open-create-modal-btn');
  const modal = document.getElementById('create-incident-modal');
  const closeModalBtn = document.getElementById('close-modal-btn');
  const cancelBtn = document.getElementById('cancel-modal-btn');
  const submitBtn = document.getElementById('submit-incident-btn');

  if (openModalBtn && modal) {
    openModalBtn.addEventListener('click', () => modal.classList.add('show'));
  }
  if (closeModalBtn && modal) {
    closeModalBtn.addEventListener('click', () => modal.classList.remove('show'));
  }
  if (cancelBtn && modal) {
    cancelBtn.addEventListener('click', () => modal.classList.remove('show'));
  }

  if (submitBtn) {
    submitBtn.addEventListener('click', () => {
      const title = document.getElementById('new-title').value.trim();
      const service = document.getElementById('new-service').value.trim();
      const severity = document.getElementById('new-severity').value;
      const description = document.getElementById('new-desc').value.trim();
      const logs = document.getElementById('new-logs').value.trim();

      if (!title || !service) {
        alert('Please provide an incident title and service name.');
        return;
      }

      const newId = 1000 + incidents.length + 1;
      const newInc = {
        id: newId,
        title,
        service,
        severity,
        status: 'open',
        description,
        logs: logs || `[${new Date().toISOString()}] [INFO] Incident created manually.`,
        created_at: new Date().toISOString(),
        ai_summary: null,
        ai_root_cause: null,
        ai_recommendations: null
      };

      incidents.unshift(newInc);
      selectedIncidentId = newId;
      modal.classList.remove('show');

      // Clear form
      document.getElementById('new-title').value = '';
      document.getElementById('new-service').value = '';
      document.getElementById('new-desc').value = '';
      document.getElementById('new-logs').value = '';

      renderIncidents();
      renderSelectedIncident();
      updateMetrics();
      showToast(`Incident #${newId} created successfully!`);
    });
  }

  // Anomaly Injector Simulation Button
  const injectBtn = document.getElementById('inject-anomaly-btn');
  if (injectBtn) {
    injectBtn.addEventListener('click', injectSyntheticOutage);
  }

  // Telemetry stream pause/resume
  const pauseStreamBtn = document.getElementById('stream-toggle-btn');
  if (pauseStreamBtn) {
    pauseStreamBtn.addEventListener('click', () => {
      isTelemetryStreaming = !isTelemetryStreaming;
      pauseStreamBtn.textContent = isTelemetryStreaming ? 'Pause Stream' : 'Resume Stream';
    });
  }
}

/* --------------------------------------------------------------------------
   Synthetic Anomaly Injection Simulator
   -------------------------------------------------------------------------- */
function injectSyntheticOutage() {
  const anomalies = [
    {
      title: "Deadlock Detected on payments-api Ledger Table",
      service: "payments-api",
      severity: "critical",
      description: "Concurrent row update locks caused transactions to abort with deadlock exceptions.",
      logs: `[${new Date().toISOString()}] [FATAL] Process 49281 detected deadlock waiting for ShareLock on transaction 8192
[${new Date().toISOString()}] [ERROR] Query aborted: UPDATE user_wallets SET balance = balance - 45.00 WHERE id = 'w_88'`
    },
    {
      title: "Authentication Token Expiration Flood",
      service: "auth-service",
      severity: "high",
      description: "Stale public key cache caused 401 Unauthorized rejections on mobile client tokens.",
      logs: `[${new Date().toISOString()}] [ERROR] 401 Unauthorized: token signature verification failed (kid mismatch)
[${new Date().toISOString()}] [WARN] Client token rejected for user_id=98421 on /api/v1/profile`
    },
    {
      title: "Microservice Ingress Gateway Latency Surge",
      service: "ingress-gateway",
      severity: "medium",
      description: "P99 latency spiked over 2,400ms due to unindexed search query load.",
      logs: `[${new Date().toISOString()}] [WARN] upstream response slow: 2,410ms on GET /api/v1/search
[${new Date().toISOString()}] [WARN] Connection queue backpressure approaching threshold (85%)`
    }
  ];

  const picked = anomalies[Math.floor(Math.random() * anomalies.length)];
  const newId = 1000 + incidents.length + 1;

  const newInc = {
    id: newId,
    title: picked.title,
    service: picked.service,
    severity: picked.severity,
    status: 'open',
    description: picked.description,
    logs: picked.logs,
    created_at: new Date().toISOString(),
    ai_summary: null,
    ai_root_cause: null,
    ai_recommendations: null
  };

  incidents.unshift(newInc);
  selectedIncidentId = newId;
  renderIncidents();
  renderSelectedIncident();
  updateMetrics();
  showToast(`💥 Anomaly injected! Incident #${newId} recorded.`);
}

/* --------------------------------------------------------------------------
   Live Synthetic Telemetry Log Generator
   -------------------------------------------------------------------------- */
function startSyntheticTelemetry() {
  const streamBody = document.getElementById('telemetry-stream-body');
  if (!streamBody) return;

  const services = ['payments-api', 'auth-service', 'database-cluster', 'ingress-gateway', 'worker-queue'];
  const messages = [
    { type: 'ok', msg: 'GET /health - 200 OK (14ms)' },
    { type: 'ok', msg: 'POST /v1/tokens - Token issued (28ms)' },
    { type: 'ok', msg: 'Job queue heartbeat OK - 0 lag' },
    { type: 'warn', msg: 'Connection pool at 78% capacity' },
    { type: 'ok', msg: 'Redis cache HIT on key user:4194' },
    { type: 'ok', msg: 'Batch billing sync completed - 240 items' },
    { type: 'err', msg: 'Upstream retry on payment gateway timeout' }
  ];

  setInterval(() => {
    if (!isTelemetryStreaming) return;

    const svc = services[Math.floor(Math.random() * services.length)];
    const item = messages[Math.floor(Math.random() * messages.length)];
    const time = new Date().toTimeString().split(' ')[0];

    const line = document.createElement('div');
    line.className = 'stream-line';
    line.innerHTML = `
      <span class="stream-time">[${time}]</span>
      <span class="stream-svc">[${svc}]</span>
      <span class="stream-${item.type}">${escapeHtml(item.msg)}</span>
    `;

    streamBody.appendChild(line);
    if (streamBody.children.length > 30) {
      streamBody.removeChild(streamBody.firstChild);
    }
    streamBody.scrollTop = streamBody.scrollHeight;
  }, 1600);
}

/* --------------------------------------------------------------------------
   Utilities
   -------------------------------------------------------------------------- */
function formatTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function showToast(message) {
  let toast = document.getElementById('toast-box');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast-box';
    toast.className = 'toast-box';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.classList.remove('show');
  }, 2600);
}

/* ==========================================================================
   Authentication & Session System (RBAC + JWT Simulation)
   ========================================================================== */
function initSentinelAuth() {
  const userBadge = document.getElementById('auth-user-badge');
  const loginBtn = document.getElementById('auth-login-btn');
  const userNameEl = document.getElementById('auth-user-name');
  const userRoleEl = document.getElementById('auth-user-role');
  const logoutBtn = document.getElementById('auth-logout-btn');

  const authModal = document.getElementById('auth-modal');
  const closeAuthBtn = document.getElementById('close-auth-modal');
  const tabLoginBtn = document.getElementById('tab-login-btn');
  const tabSignupBtn = document.getElementById('tab-signup-btn');
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');
  const quickDemoBtn = document.getElementById('quick-demo-login-btn');

  let user = null;
  try {
    const raw = localStorage.getItem('sentinel_auth_user');
    if (raw) {
      user = JSON.parse(raw);
    } else {
      user = {
        name: "Kritika Giri",
        email: "kritika.giri@brainware.edu",
        role: "SRE Lead",
        token: "jwt_sentinel_" + btoa(JSON.stringify({ sub: "kg_23", role: "SRE Lead", exp: Date.now() + 86400000 }))
      };
      localStorage.setItem('sentinel_auth_user', JSON.stringify(user));
    }
  } catch(e) {
    user = { name: "Kritika Giri", role: "SRE Lead" };
  }

  function renderAuthUI() {
    if (user) {
      if (userBadge) userBadge.style.display = 'flex';
      if (loginBtn) loginBtn.style.display = 'none';
      if (userNameEl) userNameEl.textContent = user.name;
      if (userRoleEl) userRoleEl.textContent = user.role;
    } else {
      if (userBadge) userBadge.style.display = 'none';
      if (loginBtn) loginBtn.style.display = 'inline-flex';
    }
  }

  function openAuth(tab = 'login') {
    if (!authModal) return;
    authModal.style.display = 'flex';
    switchTab(tab);
  }

  function closeAuth() {
    if (!authModal) return;
    authModal.style.display = 'none';
  }

  function switchTab(tab) {
    if (!loginForm || !signupForm) return;
    if (tab === 'login') {
      loginForm.style.display = 'block';
      signupForm.style.display = 'none';
      if (tabLoginBtn) {
        tabLoginBtn.style.background = 'rgba(139, 92, 246, 0.2)';
        tabLoginBtn.style.borderColor = 'var(--accent-primary)';
      }
      if (tabSignupBtn) {
        tabSignupBtn.style.background = 'transparent';
        tabSignupBtn.style.borderColor = 'var(--border-subtle)';
      }
    } else {
      loginForm.style.display = 'none';
      signupForm.style.display = 'block';
      if (tabSignupBtn) {
        tabSignupBtn.style.background = 'rgba(139, 92, 246, 0.2)';
        tabSignupBtn.style.borderColor = 'var(--accent-primary)';
      }
      if (tabLoginBtn) {
        tabLoginBtn.style.background = 'transparent';
        tabLoginBtn.style.borderColor = 'var(--border-subtle)';
      }
    }
  }

  if (loginBtn) loginBtn.addEventListener('click', () => openAuth('login'));
  if (closeAuthBtn) closeAuthBtn.addEventListener('click', closeAuth);
  if (tabLoginBtn) tabLoginBtn.addEventListener('click', () => switchTab('login'));
  if (tabSignupBtn) tabSignupBtn.addEventListener('click', () => switchTab('signup'));

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      user = null;
      localStorage.removeItem('sentinel_auth_user');
      renderAuthUI();
      showToast('Signed out of Sentinel Command Center.');
      setTimeout(() => openAuth('login'), 350);
    });
  }

  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value.trim();
      const role = document.getElementById('login-role').value;
      const name = email.split('@')[0].replace('.', ' ').replace(/\b\w/g, l => l.toUpperCase());

      user = {
        name: name || "Engineering Lead",
        email,
        role,
        token: "jwt_sentinel_" + btoa(JSON.stringify({ sub: email, role, exp: Date.now() + 86400000 }))
      };
      localStorage.setItem('sentinel_auth_user', JSON.stringify(user));
      renderAuthUI();
      closeAuth();
      showToast(`Welcome, ${user.name}! Authenticated as ${role}.`);
    });
  }

  if (quickDemoBtn) {
    quickDemoBtn.addEventListener('click', () => {
      user = {
        name: "Technical Recruiter (Demo)",
        email: "recruiter@interviews.ai",
        role: "Technical Interviewer",
        token: "jwt_sentinel_" + btoa(JSON.stringify({ sub: "recruiter", role: "Auditor", exp: Date.now() + 86400000 }))
      };
      localStorage.setItem('sentinel_auth_user', JSON.stringify(user));
      renderAuthUI();
      closeAuth();
      showToast('Authenticated as Recruiter Demo User! Full cluster access granted.');
    });
  }

  if (signupForm) {
    signupForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('signup-name').value.trim();
      const email = document.getElementById('signup-email').value.trim();
      const role = document.getElementById('signup-role').value;

      user = {
        name,
        email,
        role,
        token: "jwt_sentinel_" + btoa(JSON.stringify({ sub: email, role, exp: Date.now() + 86400000 }))
      };
      localStorage.setItem('sentinel_auth_user', JSON.stringify(user));
      renderAuthUI();
      closeAuth();
      showToast(`Account created for ${name}! Logged in as ${role}.`);
    });
  }

  renderAuthUI();
}
