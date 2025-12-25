import { createServer } from "node:http";
import { readDB, writeDB } from "./utils/jsonDB.js";
import { parseBoolean } from "./utils/parseBoolean.js";

let db = {};

readDB().then((data) => {
  db = data;
});

const serverResponse = (req, res, data) => {
  const allowedOrigins = ["https://nta1210.github.io", "http://localhost:5173"];
  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Vary", "Origin");

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
    const allowedOrigins = [
      "https://nta1210.github.io",
      "http://localhost:5173",
    ];
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
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === "GET" && url.pathname === "/api/tasks") {
    const params = url.searchParams;

    const title = params.get("title");
    const isCompleted = params.get("isCompleted");

    if (title) {
      const tasks = db.tasks.filter((t) => {
        const isTitleMatch = title
          ? t.title.toLowerCase().includes(title.toLowerCase())
          : true;
        const isCompletedMatch =
          isCompleted !== null
            ? t.isCompleted === parseBoolean(isCompleted)
            : true;

        return isTitleMatch && isCompletedMatch;
      });
      return serverResponse(req, res, {
        status: 200,
        data: tasks,
      });
    }

    return serverResponse(req, res, {
      status: 200,
      data: db.tasks,
    });
  }

  // =========================
  // [GET] /api/tasks/:id
  // =========================
  if (req.method === "GET" && req.url.startsWith("/api/tasks/")) {
    const id = Number(req.url.split("/").pop());
    const task = db.tasks.find((t) => t.id === id);

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
        id: db.tasks.length + 1,
        title: payload.title,
        isCompleted: false,
      };

      db.tasks.push(newTask);

      writeDB(db);

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
      const index = db.tasks.findIndex((t) => t.id === id);

      const dbTasks = [];
      readDB().then((data) => {
        dbTasks = data.tasks;
      });

      if (index !== -1) {
        db.tasks[index] = {
          ...db.tasks[index],
          ...payload,
        };

        writeDB(db);

        serverResponse(req, res, {
          status: 200,
          message: "Task updated successfully",
          data: db.tasks[index],
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
    const index = db.tasks.findIndex((t) => t.id === id);

    if (index !== -1) {
      db.tasks.splice(index, 1);

      writeDB(db);

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
  if (req.url.startsWith("/bypass-cors")) {
    const urlParams = req.url.split("?")[1];
    let targetUrl = new URLSearchParams(urlParams).get("url");

    if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
      targetUrl = "https://" + targetUrl;
    }

    const isMutable = ["POST", "PUT"].includes(req.method);
    let body = "";

    const doFetch = () => {
      fetch(targetUrl, {
        method: req.method,
        headers: {
          ...req.headers,
          "content-length": body ? Buffer.byteLength(body) : 0,
        },
        body: isMutable ? body : undefined,
      })
        .then((response) => {
          const isJSON = response.headers
            .get("content-type")
            ?.includes("application/json");

          return isJSON
            ? response.json()
            : response.text().then((t) => ({ raw: t }));
        })
        .then((data) => {
          serverResponse(req, res, {
            status: 200,
            data,
          });
        })
        .catch((error) => {
          serverResponse(req, res, {
            status: 500,
            message: error.message,
          });
        });
    };

    if (isMutable) {
      req.on("data", (chunk) => {
        body += chunk.toString();
      });

      req.on("end", doFetch);
    } else {
      doFetch();
    }

    return;
  }

  // =========================
  // NOT FOUND
  // =========================
  notFoundResponse(req, res);
});

server.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});
