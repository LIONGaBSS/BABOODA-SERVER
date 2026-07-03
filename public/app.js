const state = {
  token: localStorage.getItem("babooda_token") || "",
  me: null,
  classes: [],
  topics: [],
  users: [],
  assessments: []
};

function $(id) {
  return document.getElementById(id);
}

async function api(path, options = {}) {
  const headers = options.headers || {};
  headers["Content-Type"] = "application/json";
  if (state.token) headers["Authorization"] = `Bearer ${state.token}`;

  const res = await fetch(path, {
    ...options,
    headers
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

function setStatus(text) {
  $("authStatus").textContent = text;
}

function showAnswer(targetId, data) {
  $(targetId).textContent = typeof data === "string" ? data : JSON.stringify(data, null, 2);
}

function renderTabs() {
  document.querySelectorAll(".tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((x) => x.classList.remove("active"));
      document.querySelectorAll(".panel").forEach((x) => x.classList.remove("active"));
      btn.classList.add("active");
      document.querySelector(`#${btn.dataset.tab}Form`).classList.add("active");
    });
  });
}

function fillProfile(user) {
  if (!user) return;
  $("pName").value = user.name || "";
  $("pAge").value = user.age || "";
  $("pClassLevel").value = user.classLevel || "";
  $("pBoard").value = user.board || "";
  $("pSubjectLevel").value = user.subjectLevel || "";
  $("pLanguage").value = user.language || "";
  $("pReadingLevel").value = user.readingLevel || "";
  $("pLearningGoal").value = user.learningGoal || "";
  $("pWeakTopics").value = user.weakTopics || "";
  $("pPreferredTone").value = user.preferredTone || "";
  $("pDepthNotes").value = user.depthNotes || "";

  $("adminName").value = user.name || "";
  $("adminEmail").value = user.email || "";
  $("adminRole").value = user.role || "user";
  $("adminAge").value = user.age || "";
  $("adminClassLevel").value = user.classLevel || "";
  $("adminBoard").value = user.board || "";
  $("adminSubjectLevel").value = user.subjectLevel || "";
  $("adminLanguage").value = user.language || "";
  $("adminReadingLevel").value = user.readingLevel || "";
  $("adminLearningGoal").value = user.learningGoal || "";
  $("adminWeakTopics").value = user.weakTopics || "";
  $("adminPreferredTone").value = user.preferredTone || "";
  $("adminDepthNotes").value = user.depthNotes || "";

  $("gradeTopicId").value = state.topics[0]?.id || "";
}

function option(text, value) {
  const el = document.createElement("option");
  el.textContent = text;
  el.value = value;
  return el;
}

async function loadClassesAndTopics() {
  const classRes = await api("/api/syllabus/classes");
  state.classes = classRes.classes || [];

  $("classSelect").innerHTML = "";
  $("classSelect").appendChild(option("All classes", ""));
  state.classes.forEach((c) => $("classSelect").appendChild(option(`Class ${c}`, c)));

  await loadTopics();
}

async function loadTopics() {
  const classNo = $("classSelect").value;
  const q = $("questionInput").value.trim();
  const params = new URLSearchParams();
  if (classNo) params.set("class", classNo);
  if (q) params.set("q", q);

  const res = await api(`/api/syllabus/topics?${params.toString()}`);
  state.topics = res.topics || [];

  $("topicSelect").innerHTML = "";
  state.topics.forEach((t) => {
    const label = `Class ${t.classNo} | ${t.title}`;
    $("topicSelect").appendChild(option(label, t.id));
  });

  renderTopicList();
  if (state.topics.length) $("gradeTopicId").value = state.topics[0].id;
}

function renderTopicList() {
  const box = $("topicList");
  if (!state.topics.length) {
    box.textContent = "No topics found.";
    return;
  }
  box.innerHTML = state.topics
    .map(
      (t) => `
      <div style="padding:10px;border-bottom:1px solid #e6edf5">
        <b>${t.title}</b><br/>
        Class: ${t.classNo} | Subject: ${t.subject}<br/>
        Topic ID: ${t.id}<br/>
        Aim: ${t.aim || "-"}<br/>
        ${t.content ? t.content.slice(0, 180) : ""}
      </div>
    `
    )
    .join("");
}

async function refreshMe() {
  if (!state.token) {
    state.me = null;
    setStatus("Not logged in");
    return;
  }

  const res = await api("/api/me");
  state.me = res.user;
  setStatus(`Logged in as ${state.me.name} (${state.me.role})`);
  fillProfile(state.me);
  renderRoleUI();
}

function renderRoleUI() {
  const isAdmin = state.me?.role === "admin";
  document.querySelector(".admin-card").style.display = isAdmin ? "block" : "none";
}

async function login(email, password) {
  const res = await api("/api/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
  state.token = res.token;
  localStorage.setItem("babooda_token", state.token);
  await refreshMe();
}

async function register(payload) {
  const res = await api("/api/register", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  state.token = res.token;
  localStorage.setItem("babooda_token", state.token);
  await refreshMe();
}

async function saveProfile() {
  const payload = {
    name: $("pName").value,
    age: $("pAge").value,
    classLevel: $("pClassLevel").value,
    board: $("pBoard").value,
    subjectLevel: $("pSubjectLevel").value,
    language: $("pLanguage").value,
    readingLevel: $("pReadingLevel").value,
    learningGoal: $("pLearningGoal").value,
    weakTopics: $("pWeakTopics").value,
    preferredTone: $("pPreferredTone").value,
    depthNotes: $("pDepthNotes").value
  };

  const res = await api("/api/me", {
    method: "PUT",
    body: JSON.stringify(payload)
  });

  state.me = res.user;
  fillProfile(state.me);
  setStatus(`Profile saved for ${state.me.name}`);
}

async function askAI() {
  const question = $("questionInput").value.trim();
  const topicId = $("topicSelect").value;
  const classNo = $("classSelect").value;
  const mode = $("modeSelect").value;

  if (!question) {
    $("answerBox").textContent = "Please type a question.";
    return;
  }

  const res = await api("/api/ask", {
    method: "POST",
    body: JSON.stringify({ question, topicId, classNo, mode })
  });

  showAnswer(
    "answerBox",
    {
      topic: {
        id: res.topic.id,
        title: res.topic.title,
        classNo: res.topic.classNo,
        aim: res.topic.aim
      },
      answer: res.answer
    }
  );
}

async function saveAdminUser() {
  const userId = $("adminUserId").value.trim();
  const payload = {
    name: $("adminName").value,
    email: $("adminEmail").value,
    password: $("adminPassword").value,
    role: $("adminRole").value,
    age: $("adminAge").value,
    classLevel: $("adminClassLevel").value,
    board: $("adminBoard").value,
    subjectLevel: $("adminSubjectLevel").value,
    language: $("adminLanguage").value,
    readingLevel: $("adminReadingLevel").value,
    learningGoal: $("adminLearningGoal").value,
    weakTopics: $("adminWeakTopics").value,
    preferredTone: $("adminPreferredTone").value,
    depthNotes: $("adminDepthNotes").value
  };

  let res;
  if (userId) {
    res = await api(`/api/admin/users/${userId}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
  } else {
    res = await api("/api/admin/users", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  }

  showAnswer("gradeBox", res.user);
  await loadUsers();
}

async function loadUsers() {
  const res = await api("/api/admin/users");
  state.users = res.users || [];

  const box = $("userList");
  if (!state.users.length) {
    box.textContent = "No users.";
    return;
  }

  box.innerHTML = state.users
    .map(
      (u) => `
        <div style="padding:10px;border-bottom:1px solid #e6edf5">
          <b>${u.name}</b> (${u.role})<br/>
          Email: ${u.email}<br/>
          ID: ${u.id}<br/>
          Class: ${u.classLevel || "-"} | Age: ${u.age || "-"} | Bloom: ${u.bloomLevel || "-"} (${u.bloomScore || 0})
        </div>
      `
    )
    .join("");
}

async function generateBloom() {
  const topicId = $("topicSelect").value || $("gradeTopicId").value.trim();
  const userId = $("bloomUserId").value.trim();

  if (!topicId) {
    $("bloomBox").textContent = "Select a topic first.";
    return;
  }

  const res = await api("/api/admin/generate-bloom", {
    method: "POST",
    body: JSON.stringify({ topicId, userId: userId || null })
  });

  showAnswer("bloomBox", res.assessment);
  await loadAssessments();
}

async function gradeOneAnswer() {
  const question = $("gradeQuestion").value.trim();
  const answer = $("gradeAnswer").value.trim();
  const topicId = $("gradeTopicId").value.trim();
  const userId = $("bloomUserId").value.trim();

  const res = await api("/api/admin/grade-answer", {
    method: "POST",
    body: JSON.stringify({
      question,
      answer,
      topicId,
      userId: userId || null
    })
  });

  showAnswer("gradeBox", res);
  await refreshMe();
}

async function loadAssessments() {
  const res = await api("/api/admin/assessments");
  state.assessments = res.assessments || [];

  const box = $("assessmentList");
  if (!state.assessments.length) {
    box.textContent = "No assessments yet.";
    return;
  }

  box.innerHTML = state.assessments
    .map(
      (a) => `
        <div style="padding:10px;border-bottom:1px solid #e6edf5">
          <b>${a.topicTitle || "Assessment"}</b><br/>
          User ID: ${a.userId}<br/>
          Assessment ID: ${a.id}<br/>
          Questions: ${(a.questions || []).length}<br/>
          Created: ${a.createdAt}
        </div>
      `
    )
    .join("");
}

async function wireUp() {
  renderTabs();

  $("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await login($("loginEmail").value, $("loginPassword").value);
    } catch (err) {
      alert(err.message);
    }
  });

  $("registerForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await register({
        name: $("regName").value,
        email: $("regEmail").value,
        password: $("regPassword").value,
        role: $("regRole").value
      });
    } catch (err) {
      alert(err.message);
    }
  });

  $("saveProfileBtn").addEventListener("click", async () => {
    try {
      await saveProfile();
    } catch (err) {
      alert(err.message);
    }
  });

  $("askBtn").addEventListener("click", async () => {
    try {
      await askAI();
    } catch (err) {
      alert(err.message);
    }
  });

  $("classSelect").addEventListener("change", loadTopics);
  $("questionInput").addEventListener("input", () => {
    clearTimeout(window.__topicTimer);
    window.__topicTimer = setTimeout(loadTopics, 350);
  });

  $("saveAdminUserBtn").addEventListener("click", async () => {
    try {
      await saveAdminUser();
    } catch (err) {
      alert(err.message);
    }
  });

  $("loadUsersBtn").addEventListener("click", async () => {
    try {
      await loadUsers();
    } catch (err) {
      alert(err.message);
    }
  });

  $("generateBloomBtn").addEventListener("click", async () => {
    try {
      await generateBloom();
    } catch (err) {
      alert(err.message);
    }
  });

  $("gradeBtn").addEventListener("click", async () => {
    try {
      await gradeOneAnswer();
    } catch (err) {
      alert(err.message);
    }
  });

  $("reloadTopicsBtn").addEventListener("click", async () => {
    try {
      await loadClassesAndTopics();
    } catch (err) {
      alert(err.message);
    }
  });

  $("loadAssessmentsBtn").addEventListener("click", async () => {
    try {
      await loadAssessments();
    } catch (err) {
      alert(err.message);
    }
  });

  try {
    await loadClassesAndTopics();
  } catch (err) {
    console.error(err);
  }

  if (state.token) {
    try {
      await refreshMe();
      if (state.me?.role === "admin") {
        await loadUsers();
        await loadAssessments();
      }
    } catch (err) {
      localStorage.removeItem("babooda_token");
      state.token = "";
      setStatus("Login expired");
    }
  } else {
    renderRoleUI();
  }
}

wireUp();
