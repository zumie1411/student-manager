const taskInput = document.getElementById("task-input");
const subjectInput = document.getElementById("subject-input");
const deadlineInput = document.getElementById("deadline-input");
const priorityInput = document.getElementById("priority-input");

const addTaskButton = document.getElementById("add-task-btn");
const taskList = document.getElementById("task-list");

const totalTasks = document.getElementById("total-tasks");
const completedTasks = document.getElementById("completed-tasks");
const pendingTasks = document.getElementById("pending-tasks");

let tasks = [];

addTaskButton.addEventListener("click", function () {

    const task = {
        title: taskInput.value,
        subject: subjectInput.value,
        deadline: deadlineInput.value,
        priority: priorityInput.value,
        completed: false
    };

    tasks.push(task);

    displayTasks();
    updateDashboard();

    taskInput.value = "";
    subjectInput.value = "";
    deadlineInput.value = "";
    priorityInput.value = "";
});


function displayTasks() {

    taskList.innerHTML = "";

    tasks.forEach(function (task, index) {

        const taskItem = document.createElement("div");

        taskItem.classList.add("task-item");

        taskItem.innerHTML = `
            <div class="task-info">

                <h3>${task.title}</h3>

                <p>Subject: ${task.subject}</p>
                <p>Deadline: ${task.deadline}</p>
                <p>Priority: ${task.priority}</p>

                <button onclick="completeTask(${index})">
                    ${task.completed ? " Undo" : " Complete"}
                </button>

                <button onclick="deleteTask(${index})">
                     Delete
                </button>

            </div>
        `;

        taskList.appendChild(taskItem);
    });
}


function completeTask(index) {

    tasks[index].completed = !tasks[index].completed;

    displayTasks();
    updateDashboard();
}


function deleteTask(index) {

    tasks.splice(index, 1);

    displayTasks();
    updateDashboard();
}


function updateDashboard() {

    const total = tasks.length;

    const completed = tasks.filter(function (task) {
        return task.completed;
    }).length;

    const pending = total - completed;

    totalTasks.textContent = total;
    completedTasks.textContent = completed;
    pendingTasks.textContent = pending;
}