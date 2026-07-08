const API_BASE = "";

const state = {
  token: localStorage.getItem("babooda_token") || "",
  me: null,
  classes: [],
  topics: [],
  broadcasts: [],
  evaluations: [],
  role: ""
};

function $(id) {
  return document.getElementById(id);
}

async function api(path, options = {}) {
  const headers = options.headers || {};
  headers["Content-Type"] = "application/json";
  if (state.token) headers["Authorization"] = `Bearer ${state.token}`;

  const res = await fetch(API_BASE + path, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

function show(id, on) {
  $(id).classList.toggle("hidden", !on);
}

function renderProfile() {
  if (!state.me) return;
  $("profileBox").textContent = JSON.stringify(state.me, null, 2);
}

function setStatus(text) {
  $("statusPill").textContent = text;
}

function renderRoleCards() {
  show("profileCard", !!state.me);
  show("syllabusCard", !!state.me);
  show("adminCard", state.me?.role === "admin");
  show("userCard", state.me?.role === "user");
  show("organizerCard", state.me?.role === "organizer");
}

function fillSelect(el, items, mapFn) {
  el.innerHTML = "";
  for (const item of items) {
    const o = document.createElement("option");
    const mapped = mapFn(item);
    o.value = mapped.value;
    o.textContent = mapped.label;
    el.appendChild(o);
  }
}

async function loadClasses() {
  const res = await api("/api/syllabus/classes");
  state.classes = res.classes || [];
  fillSelect($("classSelect"), state.classes, (c) => ({
    value: c,
    label: `Class ${c}`
  }));
  fillSelect($("adminClassSelect"), state.classes, (c) => ({
    value: c,
    label: `Class ${c}`
  }));
}

async function loadTopics() {
  const classNo = $("classSelect").value || "";
  const q = $("topicSearch").value || "";
  const res = await api(`/api/syllabus/topics?classNo=${encodeURIComponent(classNo)}&q=${encodeURIComponent(q)}`);
  state.topics = res.topics || [];
  renderTopics();

  fillSelect($("adminTopicSelect"), state.topics, (t) => ({
    value: t.id,
    label: `Class ${t.classNo} | ${t.title}`
  }));

  fillSelect($("userTopicSelect"), state.topics, (t) => ({
    value: t.id,
    label: `Class ${t.classNo} | ${t.title}`
  }));

  fillSelect($("evalBroadcastSelect"), state.broadcasts, (b) => ({
    value: b.id,
    label: `${b.title} | Class ${b.classNo}`
  }));
}

function renderTopics() {
  $("topicList").textContent = state.topics.length
    ? state.topics
        .map(
          (t) =>
            `Topic ID: ${t.id}\nClass: ${t.classNo}\nSubject: ${t.subject}\nTitle: ${t.title}\nAim: ${t.aim || "-"}\nContent: ${t.content.slice(0, 220)}\n`
        )
        .join("\n---\n")
    : "No topics found.";
}

async function loadMe() {
  if (!state.token) return;
  const res = await api("/api/auth/me");
  state.me = res.user;
  state.role = state.me.role;
  setStatus(`Logged in as ${state.me.role}: ${state.me.name}`);
  renderProfile();
  renderRoleCards();
}

async function login(role, organizationId, password) {
  const res = await api("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ role, organizationId, password })
  });
  state.token = res.token;
  localStorage.setItem("babooda_token", state.token);
  state.me = res.user;
  state.role = res.user.role;
  setStatus(`Logged in as ${res.user.role}: ${res.user.name}`);
  renderProfile();
  renderRoleCards();
  await refreshDashboards();
}

async function register(payload) {
  const res = await api("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  state.token = res.token;
  localStorage.setItem("babooda_token", state.token);
  state.me = res.user;
  state.role = res.user.role;
  setStatus(`Registered: ${res.user.name}`);
  renderProfile();
  renderRoleCards();
  await refreshDashboards();
}

async function refreshDashboards() {
  await loadClasses();
  await loadTopics();

  if (state.me?.role === "admin") {
    const bro = await api("/api/admin/broadcasts");
    state.broadcasts = bro.broadcasts || [];
    fillSelect($("evalBroadcastSelect"), state.broadcasts, (b) => ({
      value: b.id,
      label: `${b.title} | Class ${b.classNo}`
    }));
  }

  if (state.me?.role === "user") {
    const feed = await api("/api/user/feed");
    state.broadcasts = feed.broadcasts || [];
    state.evaluations = feed.evaluations || [];
  }
}

function loginUI() {
  $("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await login($("loginRole").value, $("loginId").value, $("loginPassword").value);
    } catch (err) {
      alert(err.message);
    }
  });

  $("registerForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await register({
        role: $("regRole").value,
        organizationId: $("regId").value,
        name: $("regName").value,
        password: $("regPassword").value,
        age: $("regAge").value,
        classNo: $("regClassNo").value,
        subject: $("regSubject").value,
        designation: $("regDesignation").value,
        discipline: $("regDiscipline").value,
        school: $("regSchool").value,
        department: $("regDepartment").value,
        address: $("regAddress").value,
        phone: $("regPhone").value,
        email: $("regEmail").value
      });
    } catch (err) {
      alert(err.message);
    }
  });
}

async function saveProfile() {
  const res = await api("/api/auth/me", {
    method: "PUT",
    body: JSON.stringify({
      name: state.me.name,
      age: state.me.profile?.age || "",
      classNo: state.me.profile?.classNo || "",
      subject: state.me.profile?.subject || "",
      designation: state.me.profile?.designation || "",
      discipline: state.me.profile?.discipline || "",
      school: state.me.profile?.school || "",
      department: state.me.profile?.department || "",
      address: state.me.profile?.address || "",
      phone: state.me.profile?.phone || "",
      email: state.me.profile?.email || ""
    })
  });
  state.me = res.user;
  renderProfile();
}

function adminUI() {
  $("aimBtn").addEventListener("click", async () => {
    const topicId = $("adminTopicSelect").value;
    const classNo = $("adminClassSelect").value;
    const question = $("adminQuestion").value || "What is the aim of this topic?";
    const res = await api("/api/admin/aim", {
      method: "POST",
      body: JSON.stringify({ topicId, classNo, question })
    });
    $("adminAIBox").value = JSON.stringify(res.answer, null, 2);
  });

  $("broadcastBtn").addEventListener("click", async () => {
    const topicId = $("adminTopicSelect").value;
    const topic = state.topics.find((t) => t.id === topicId);
    const payload = {
      topicId,
      classNo: topic.classNo,
      subject: topic.subject,
      title: topic.title,
      adminId: state.me.id,
      aiAnswer: $("adminAIBox").value,
      editedAnswer: $("adminAIBox").value
    };
    const res = await api("/api/admin/broadcast", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    alert(`Broadcasted: ${res.broadcast.title}`);
    await refreshDashboards();
  });

  $("loadRemindersBtn").addEventListener("click", async () => {
    const res = await api("/api/admin/reminders");
    $("reminderBox").textContent = JSON.stringify(res.reminders, null, 2);
  });

  $("loadUsersBtn").addEventListener("click", async () => {
    const classNo = $("adminClassSelect").value;
    const res = await api(`/api/admin/users?classNo=${encodeURIComponent(classNo)}&role=user`);
    $("adminUserBox").textContent = JSON.stringify(res.users, null, 2);
  });

  $("genEvalBtn").addEventListener("click", async () => {
    const broadcastId = $("evalBroadcastSelect").value;
    const res = await api("/api/admin/generate-evaluation", {
      method: "POST",
      body: JSON.stringify({ broadcastId })
    });
    $("evalBox").textContent = JSON.stringify(res.evaluation, null, 2);
  });

  $("loadReportBtn").addEventListener("click", async () => {
    const year = $("reportYear").value || new Date().getFullYear();
    const res = await api(`/api/admin/report/${encodeURIComponent(year)}`);
    $("reportBox").textContent = JSON.stringify(res, null, 2);
  });
}

function userUI() {
  $("loadFeedBtn").addEventListener("click", async () => {
    const res = await api("/api/user/feed");
    $("feedBox").textContent = JSON.stringify(res, null, 2);
    fillSelect($("userTopicSelect"), res.broadcasts || [], (b) => ({
      value: b.topicId,
      label: `${b.title} | Class ${b.classNo}`
    }));
  });

  $("loadEvaluationsBtn").addEventListener("click", async () => {
    const res = await api("/api/user/evaluations");
    $("evalFeedBox").textContent = JSON.stringify(res.evaluations, null, 2);
  });

  document.querySelectorAll(".modeBtn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const mode = btn.dataset.mode;
      const topicId = $("userTopicSelect").value;
      const question = $("userQuestion").value;
      const res = await api("/api/user/ask", {
        method: "POST",
        body: JSON.stringify({ topicId, question, mode })
      });
      $("userAnswerBox").textContent = JSON.stringify(res.answer, null, 2);
    });
  });
}

function organizerUI() {
  $("loadDashboardBtn").addEventListener("click", async () => {
    const res = await api("/api/organizer/dashboard");
    $("adminListBox").textContent = JSON.stringify(res.admins, null, 2);
    $("userListBox").textContent = JSON.stringify(res.users, null, 2);
  });

  $("loadDeregBtn").addEventListener("click", async () => {
    const res = await api("/api/organizer/deregister-requests");
    $("deregBox").textContent = JSON.stringify(res.requests, null, 2);
  });

  $("deregRequestBtn").addEventListener("click", async () => {
    const res = await api("/api/organizer/deregister/request", {
      method: "POST",
      body: JSON.stringify({
        targetUserId: $("deregTargetId").value,
        reason: $("deregReason").value
      })
    });
    $("deregBox").textContent = JSON.stringify(res.request, null, 2);
  });

  $("approveBtn").addEventListener("click", async () => {
    const res = await api("/api/organizer/deregister/approve", {
      method: "POST",
      body: JSON.stringify({ requestId: $("approveRequestId").value })
    });
    $("deregBox").textContent = JSON.stringify(res.request, null, 2);
  });
}

function wireSearch() {
  $("classSelect").addEventListener("change", loadTopics);
  $("topicSearch").addEventListener("input", () => {
    clearTimeout(window.__topicTimer);
    window.__topicTimer = setTimeout(loadTopics, 300);
  });
}

async function init() {
  loginUI();
  wireSearch();

  $("saveProfileBtn").addEventListener("click", async () => {
    try {
      await saveProfile();
      alert("Profile saved.");
    } catch (err) {
      alert(err.message);
    }
  });

  try {
    await loadClasses();
    await loadTopics();
    if (state.token) {
      await loadMe();
      await refreshDashboards();
    }
  } catch (err) {
    console.error(err);
  }

  adminUI();
  userUI();
  organizerUI();

  if (!state.token) {
    setStatus("Not logged in");
  }
}

init();
