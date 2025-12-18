import { createServer } from "node:http";

const tasks = [
  { id: 1, title: "Task One", isCompleted: false },
  { id: 2, title: "Task Two", isCompleted: true },
  { id: 3, title: "Task Three", isCompleted: false },
];

const serverResponse = (req, res, data) => {
  const allowedOrigins = ["https://nta1210.github.io", "http://localhost:5173"];
  const origin = req.headers.origin;

  console.log(origin);

  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.writeHead(data.status || 200, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });

  res.end(JSON.stringify(data));
};

const notFoundResponse = (req, res) => {
  serverResponse(req, res, {
    status: 404,
    message: "Resource not found",
  });
};

const server = createServer((req, res) => {
  if (req.method === "OPTIONS") {
    const allowedOrigins = ["http://localhost:5173"];
    const origin = req.headers.origin;

    if (allowedOrigins.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
    }

    res.writeHead(204, {
      "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
    return;
  }

  // =========================
  // [GET] /api/tasks
  // =========================
  if (req.method === "GET" && req.url === "/api/tasks") {
    serverResponse(req, res, {
      status: 200,
      data: tasks,
    });
    return;
  }

  // =========================
  // [GET] /api/tasks/:id
  // =========================
  if (req.method === "GET" && req.url.startsWith("/api/tasks/")) {
    const id = Number(req.url.split("/").pop());
    const task = tasks.find((t) => t.id === id);

    if (task) {
      serverResponse(req, res, {
        status: 200,
        data: task,
      });
    } else {
      notFoundResponse(req, res);
    }
    return;
  }

  // =========================
  // [POST] /api/tasks
  // =========================
  if (req.method === "POST" && req.url === "/api/tasks") {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", () => {
      const payload = JSON.parse(body);

      const newTask = {
        id: tasks.length + 1,
        title: payload.title,
        isCompleted: false,
      };

      tasks.push(newTask);

      serverResponse(req, res, {
        status: 201,
        message: "Task created successfully",
        data: newTask,
      });
    });
    return;
  }

  // =========================
  // [PUT] /api/tasks/:id
  // =========================
  if (req.method === "PUT" && req.url.startsWith("/api/tasks/")) {
    const id = Number(req.url.split("/").pop());
    let body = "";

    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", () => {
      const payload = JSON.parse(body);
      const index = tasks.findIndex((t) => t.id === id);

      if (index !== -1) {
        tasks[index] = {
          ...tasks[index],
          ...payload,
        };

        serverResponse(req, res, {
          status: 200,
          message: "Task updated successfully",
          data: tasks[index],
        });
      } else {
        notFoundResponse(req, res);
      }
    });
    return;
  }

  // =========================
  // [DELETE] /api/tasks/:id
  // =========================
  if (req.method === "DELETE" && req.url.startsWith("/api/tasks/")) {
    const id = Number(req.url.split("/").pop());
    const index = tasks.findIndex((t) => t.id === id);

    if (index !== -1) {
      tasks.splice(index, 1);

      serverResponse(req, res, {
        status: 200,
        message: "Task deleted successfully",
      });
    } else {
      notFoundResponse(req, res);
    }
    return;
  }

  // =========================
  // /bypass-cors?url=...
  // =========================
  if (req.method === "GET" && req.url.startsWith("/bypass-cors")) {
    const urlParams = req.url.split("?")[1];
    const targetUrl = new URLSearchParams(urlParams).get("url");

    fetch(targetUrl)
      .then((response) => response.json())
      .then((data) => {
        serverResponse(req, res, {
          status: 200,
          data: data,
        });
      });

    return;
  }

  // =========================
  // NOT FOUND
  // =========================
  notFoundResponse(req, res);
});

server.listen(3000, () => {
  console.log("Server is running on http://127.0.0.1:3000");
});
