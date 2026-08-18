let tasks = JSON.parse(localStorage.getItem("studyflowTasks")) || [];
let playlists = JSON.parse(localStorage.getItem("studyflowPlaylists")) || [];
let streak = Number(localStorage.getItem("studyflowStreak")) || 0;
let lastStudyDate = localStorage.getItem("studyflowLastStudyDate") || "";
let pomodoroCount = Number(localStorage.getItem("studyflowPomodoroCount")) || 0;

let timerInterval = null;
let timerSeconds = 1500;
let timerRunning = false;
let timerMode = "focus";

const taskForm = document.getElementById("taskForm");
const taskName = document.getElementById("taskName");
const subject = document.getElementById("subject");
const deadline = document.getElementById("deadline");
const priority = document.getElementById("priority");
const taskList = document.getElementById("taskList");
const searchInput = document.getElementById("searchInput");
const subjectFilter = document.getElementById("subjectFilter");
const statusFilter = document.getElementById("statusFilter");
const focusTask = document.getElementById("focusTask");
const timerDisplay = document.getElementById("timerDisplay");
const playlistForm = document.getElementById("playlistForm");
const playlistInput = document.getElementById("playlistInput");

function saveData() {
    localStorage.setItem("studyflowTasks", JSON.stringify(tasks));
    localStorage.setItem("studyflowPlaylists", JSON.stringify(playlists));
    localStorage.setItem("studyflowStreak", streak);
    localStorage.setItem("studyflowLastStudyDate", lastStudyDate);
    localStorage.setItem("studyflowPomodoroCount", pomodoroCount);
}

function formatDate(dateString) {
    if (!dateString) return "No deadline";
    return new Date(dateString + "T00:00:00").toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}

function updateDate() {
    const now = new Date();

    document.getElementById("currentDay").textContent =
        now.toLocaleDateString("en-IN", { weekday: "long" });

    document.getElementById("currentDate").textContent =
        now.toLocaleDateString("en-IN", {
            day: "numeric",
            month: "long",
            year: "numeric"
        });
}

function updateStats() {
    const total = tasks.length;
    const completed = tasks.filter(task => task.completed).length;
    const pending = total - completed;
    const percentage = total ? Math.round((completed / total) * 100) : 0;

    document.getElementById("totalTasks").textContent = total;
    document.getElementById("completedTasks").textContent = completed;
    document.getElementById("pendingTasks").textContent = pending;
    document.getElementById("progressPercent").textContent = percentage + "%";
    document.getElementById("progressLabel").textContent = percentage + "%";
    document.getElementById("overallProgress").style.width = percentage + "%";

    const message = document.getElementById("progressMessage");

    if (total === 0) {
        message.textContent = "Add your first task to get started.";
    } else if (percentage === 100) {
        message.textContent = "Amazing! All your tasks are complete 🎉";
    } else if (percentage >= 75) {
        message.textContent = "You're almost there. Keep going! 🚀";
    } else if (percentage >= 50) {
        message.textContent = "Great progress. Stay consistent! 💪";
    } else {
        message.textContent = "Keep working toward your study goals.";
    }
}

function updateGoal() {
    const today = new Date().toISOString().split("T")[0];

    const completedToday = tasks.filter(task =>
        task.completed && task.completedDate === today
    ).length;

    const percentage = Math.min((completedToday / 5) * 100, 100);

    document.getElementById("todayCompleted").textContent = completedToday;
    document.getElementById("goalProgress").style.width = percentage + "%";

    if (completedToday >= 5) {
        document.getElementById("goalMessage").textContent =
            "Daily goal completed! 🎉";
    } else {
        document.getElementById("goalMessage").textContent =
            `Complete ${5 - completedToday} more task${5 - completedToday === 1 ? "" : "s"} today.`;
    }
}

function updateStreak() {
    document.getElementById("streakCount").textContent = streak;

    if (streak === 0) {
        document.getElementById("streakMessage").textContent =
            "Complete a task today to start your streak.";
    } else if (streak === 1) {
        document.getElementById("streakMessage").textContent =
            "Great start! Come back tomorrow. 🔥";
    } else {
        document.getElementById("streakMessage").textContent =
            "You're building a great habit! Keep going. 🔥";
    }
}

function updateStreakOnCompletion() {
    const today = new Date();
    const todayString = today.toISOString().split("T")[0];

    if (lastStudyDate === todayString) return;

    if (lastStudyDate) {
        const previous = new Date(lastStudyDate + "T00:00:00");
        const difference = Math.floor(
            (today - previous) / (1000 * 60 * 60 * 24)
        );

        if (difference === 1) {
            streak++;
        } else if (difference > 1) {
            streak = 1;
        }
    } else {
        streak = 1;
    }

    lastStudyDate = todayString;
    saveData();
}

function renderSubjectProgress() {
    const container = document.getElementById("subjectProgress");

    if (!tasks.length) {
        container.innerHTML =
            '<p class="empty-state">Add some tasks to see your subject progress.</p>';
        return;
    }

    const subjects = {};

    tasks.forEach(task => {
        if (!subjects[task.subject]) {
            subjects[task.subject] = {
                total: 0,
                completed: 0
            };
        }

        subjects[task.subject].total++;

        if (task.completed) {
            subjects[task.subject].completed++;
        }
    });

    container.innerHTML = Object.entries(subjects).map(([name, data]) => {
        const percentage = Math.round((data.completed / data.total) * 100);

        return `
            <div class="subject-row">
                <div class="subject-top">
                    <span>${name}</span>
                    <span>${data.completed}/${data.total} • ${percentage}%</span>
                </div>
                <div class="subject-bar">
                    <div style="width:${percentage}%"></div>
                </div>
            </div>
        `;
    }).join("");
}

function renderDeadlines() {
    const container = document.getElementById("deadlines");

    const upcoming = tasks
        .filter(task => task.deadline && !task.completed)
        .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
        .slice(0, 5);

    if (!upcoming.length) {
        container.innerHTML =
            '<p class="empty-state">No upcoming deadlines 🎉</p>';
        return;
    }

    container.innerHTML = upcoming.map(task => `
        <div class="deadline-item">
            <div>
                <div class="deadline-title">${escapeHTML(task.name)}</div>
                <div class="deadline-meta">${escapeHTML(task.subject)} • ${task.priority} priority</div>
            </div>
            <div class="deadline-date">${formatDate(task.deadline)}</div>
        </div>
    `).join("");
}

function renderTasks() {
    const search = searchInput.value.toLowerCase().trim();
    const subjectValue = subjectFilter.value;
    const statusValue = statusFilter.value;

    const filtered = tasks.filter(task => {
        const matchesSearch =
            task.name.toLowerCase().includes(search) ||
            task.subject.toLowerCase().includes(search);

        const matchesSubject =
            subjectValue === "all" || task.subject === subjectValue;

        const matchesStatus =
            statusValue === "all" ||
            (statusValue === "completed" && task.completed) ||
            (statusValue === "pending" && !task.completed);

        return matchesSearch && matchesSubject && matchesStatus;
    });

    document.getElementById("taskCountBadge").textContent = filtered.length;

    if (!filtered.length) {
        taskList.innerHTML = '<p class="empty-state">No tasks found.</p>';
        updateFocusTasks();
        return;
    }

    taskList.innerHTML = filtered.map(task => `
        <div class="task-item ${task.completed ? "completed" : ""}">
            <div class="task-main">
                <input
                    class="task-check"
                    type="checkbox"
                    data-id="${task.id}"
                    ${task.completed ? "checked" : ""}
                >

                <div class="task-info">
                    <div class="task-title">${escapeHTML(task.name)}</div>

                    <div class="task-details">
                        <span class="tag">${escapeHTML(task.subject)}</span>
                        <span class="tag priority-${task.priority.toLowerCase()}">
                            ${task.priority}
                        </span>
                        ${task.deadline ? `<span class="tag">📅 ${formatDate(task.deadline)}</span>` : ""}
                    </div>

                    <div class="task-actions">
                        <button data-action="edit" data-id="${task.id}">✏️ Edit</button>
                        <button data-action="delete" data-id="${task.id}" class="delete-btn">🗑️ Delete</button>
                    </div>
                </div>
            </div>
        </div>
    `).join("");

    updateFocusTasks();
}

function addTask(event) {
    event.preventDefault();

    const name = taskName.value.trim();

    if (!name || !subject.value) return;

    const task = {
        id: Date.now().toString(),
        name,
        subject: subject.value,
        deadline: deadline.value,
        priority: priority.value,
        completed: false,
        completedDate: null,
        createdAt: new Date().toISOString()
    };

    tasks.unshift(task);
    saveData();

    taskForm.reset();
    priority.value = "Medium";

    renderAll();
}

function toggleTask(id) {
    const task = tasks.find(item => item.id === id);

    if (!task) return;

    task.completed = !task.completed;

    if (task.completed) {
        task.completedDate = new Date().toISOString().split("T")[0];
        updateStreakOnCompletion();
    } else {
        task.completedDate = null;
    }

    saveData();
    renderAll();
}

function editTask(id) {
    const task = tasks.find(item => item.id === id);

    if (!task) return;

    const newName = prompt("Edit task name:", task.name);

    if (newName === null) return;

    const trimmed = newName.trim();

    if (!trimmed) return;

    task.name = trimmed;

    saveData();
    renderAll();
}

function deleteTask(id) {
    const confirmed = confirm("Delete this task?");

    if (!confirmed) return;

    tasks = tasks.filter(task => task.id !== id);

    saveData();
    renderAll();
}

function updateFocusTasks() {
    const pendingTasks = tasks.filter(task => !task.completed);

    focusTask.innerHTML =
        '<option value="">🎯 Select a task</option>' +
        pendingTasks.map(task =>
            `<option value="${task.id}">${escapeHTML(task.name)}</option>`
        ).join("");
}

function updateTimerDisplay() {
    const minutes = Math.floor(timerSeconds / 60);
    const seconds = timerSeconds % 60;

    timerDisplay.textContent =
        `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function setTimerMode(mode) {
    stopTimer();

    timerMode = mode;
    timerSeconds = mode === "focus" ? 1500 : 300;

    document.getElementById("focusModeBtn").classList.toggle(
        "active",
        mode === "focus"
    );

    document.getElementById("breakModeBtn").classList.toggle(
        "active",
        mode === "break"
    );

    document.getElementById("focusStatus").textContent =
        mode === "focus" ? "Focus Session" : "Break";

    updateTimerDisplay();
}

function startTimerFunction() {
    if (timerRunning) return;

    if (timerMode === "focus" && !focusTask.value) {
        alert("Please select a task before starting Focus Mode.");
        return;
    }

    timerRunning = true;
    document.getElementById("focusStatus").textContent =
        timerMode === "focus" ? "Studying..." : "Taking a break";

    timerInterval = setInterval(() => {
        timerSeconds--;

        updateTimerDisplay();

        if (timerSeconds <= 0) {
            stopTimer();

            if (timerMode === "focus") {
                pomodoroCount++;
                saveData();
                document.getElementById("pomodoroCount").textContent = pomodoroCount;
                alert("Focus session complete! Time for a break 🎉");
                setTimerMode("break");
            } else {
                alert("Break finished! Ready for another focus session?");
                setTimerMode("focus");
            }
        }
    }, 1000);
}

function stopTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
    timerRunning = false;

    if (document.getElementById("focusStatus")) {
        document.getElementById("focusStatus").textContent = "Paused";
    }
}

function resetTimer() {
    stopTimer();
    timerSeconds = timerMode === "focus" ? 1500 : 300;
    document.getElementById("focusStatus").textContent = "Ready";
    updateTimerDisplay();
}

function addPlaylist(event) {
    event.preventDefault();

    const url = playlistInput.value.trim();

    if (!url) return;

    if (!url.includes("spotify.com") && !url.includes("youtube.com") && !url.includes("youtu.be")) {
        alert("Please enter a valid Spotify or YouTube link.");
        return;
    }

    const type = url.includes("spotify") ? "Spotify" : "YouTube";

    playlists.unshift({
        id: Date.now().toString(),
        url,
        type
    });

    saveData();
    playlistForm.reset();
    renderPlaylists();
}

function renderPlaylists() {
    const container = document.getElementById("playlistList");

    if (!playlists.length) {
        container.innerHTML =
            '<p class="empty-state">No playlists added yet.</p>';
        return;
    }

    container.innerHTML = playlists.map(playlist => `
        <div class="playlist-card">
            <button class="remove-playlist" data-playlist="${playlist.id}">✕</button>
            <h4>${playlist.type === "Spotify" ? "🎵" : "▶️"} ${playlist.type} Playlist</h4>
            <span>Saved study playlist</span>
            <a href="${escapeAttribute(playlist.url)}" target="_blank" rel="noopener noreferrer">
                Open Playlist →
            </a>
        </div>
    `).join("");
}

function removePlaylist(id) {
    playlists = playlists.filter(playlist => playlist.id !== id);
    saveData();
    renderPlaylists();
}

function escapeHTML(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
    return String(value).replaceAll('"', "&quot;");
}

function renderAll() {
    updateStats();
    updateGoal();
    updateStreak();
    renderSubjectProgress();
    renderDeadlines();
    renderTasks();
    renderPlaylists();
    document.getElementById("pomodoroCount").textContent = pomodoroCount;
}

taskForm.addEventListener("submit", addTask);

taskList.addEventListener("click", event => {
    const button = event.target.closest("button");

    if (button) {
        const id = button.dataset.id;
        const action = button.dataset.action;

        if (action === "edit") editTask(id);
        if (action === "delete") deleteTask(id);
    }

    if (event.target.classList.contains("task-check")) {
        toggleTask(event.target.dataset.id);
    }
});

searchInput.addEventListener("input", renderTasks);
subjectFilter.addEventListener("change", renderTasks);
statusFilter.addEventListener("change", renderTasks);

document.getElementById("startTimer").addEventListener("click", startTimerFunction);
document.getElementById("pauseTimer").addEventListener("click", stopTimer);
document.getElementById("resetTimer").addEventListener("click", resetTimer);

document.getElementById("focusModeBtn").addEventListener("click", () => {
    setTimerMode("focus");
});

document.getElementById("breakModeBtn").addEventListener("click", () => {
    setTimerMode("break");
});

playlistForm.addEventListener("submit", addPlaylist);

document.getElementById("playlistList").addEventListener("click", event => {
    const button = event.target.closest(".remove-playlist");

    if (!button) return;

    removePlaylist(button.dataset.playlist);
});

document.getElementById("themeToggle").addEventListener("click", () => {
    document.body.classList.toggle("light");

    const lightMode = document.body.classList.contains("light");

    localStorage.setItem("studyflowTheme", lightMode ? "light" : "dark");

    document.getElementById("themeToggle").textContent =
        lightMode ? "🌙 Dark Mode" : "☀️ Light Mode";
});

const savedTheme = localStorage.getItem("studyflowTheme");

if (savedTheme === "light") {
    document.body.classList.add("light");
    document.getElementById("themeToggle").textContent = "🌙 Dark Mode";
}

updateDate();
renderAll();
updateTimerDisplay();