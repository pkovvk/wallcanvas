const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const app = express();

app.use(express.json());
app.use(express.static("public"));

const upload = multer({
    dest: "data/uploads/"
});

const LOCK_FILE = "data/lock.json";
const STATE = "data/canvas.json";

function getLock() {
    if (!fs.existsSync(LOCK_FILE)) {
        return null;
    }

    return JSON.parse(
        fs.readFileSync(LOCK_FILE)
    );
}


function clearLock() {
    if (fs.existsSync(LOCK_FILE)) {
        fs.unlinkSync(LOCK_FILE);
    }
}

async function renderWallpaper(state) {

    const browser = await chromium.launch({
        headless: true
    });

    const page = await browser.newPage({
        viewport: {
            width: 1920,
            height: 1080
        }
    });

    await page.goto("http://localhost:3000/render.html");


    const png = await page.evaluate(async (state) => {

        const canvas = new fabric.Canvas("canvas");

        await new Promise(resolve => {
            canvas.loadFromJSON(state, () => {
                canvas.renderAll();
                resolve();
            });
        });

        return canvas.toDataURL("png");

    }, state);


    fs.writeFileSync(
        "data/wallpaper.png",
        Buffer.from(
            png.split(",")[1],
            "base64"
        )
    );


    await browser.close();
}


app.get("/state", (req, res) => {
    if (!fs.existsSync(STATE)) {
        return res.json({});
    }

    res.sendFile(path.resolve(STATE));
});


app.post("/state", async (req, res) => {

    fs.writeFileSync(
        STATE,
        JSON.stringify(req.body, null, 2)
    );

    await renderWallpaper(req.body);

    res.json({
        ok: true
    });
});

app.post("/upload", upload.single("image"), (req, res) => {

    const ext = path.extname(req.file.originalname);

    const name = req.file.filename + ext;

    fs.renameSync(
        req.file.path,
        "data/uploads/" + name
    );


    res.json({
        url: "/uploads/" + name
    });

});

app.delete("/delete/:file", (req, res) => {

    const file =
        path.join(
            "data/uploads",
            req.params.file
        );


    if (fs.existsSync(file)) {
        fs.unlinkSync(file);
    }


    res.json({
        ok: true
    });

});

app.post("/sync", (req, res) => {
    if (!fs.existsSync(STATE)) {
        return res.status(404).json({
            ok: false,
            error: "canvas.json not found"
        });
    }

    const canvas = JSON.parse(
        fs.readFileSync(STATE, "utf8")
    );

    // Файлы, которые используются в canvas
    const used = new Set();

    function collect(obj) {
        if (!obj) return;

        if (Array.isArray(obj)) {
            obj.forEach(collect);
            return;
        }

        if (typeof obj !== "object") return;

        if (typeof obj.src === "string") {
            used.add(path.basename(obj.src));
        }

        Object.values(obj).forEach(collect);
    }

    collect(canvas);

    const uploadsDir = "data/uploads";

    const deleted = [];

    for (const file of fs.readdirSync(uploadsDir)) {
        if (!used.has(file)) {
            fs.unlinkSync(path.join(uploadsDir, file));
            deleted.push(file);
        }
    }

    res.json({
        ok: true,
        used: [...used],
        deleted
    });
});

app.get("/wallpaper.png", (req, res) => {
    res.sendFile(
        path.resolve("data/wallpaper.png")
    );
});

app.get("/lock", (req, res) => {

    const lock = getLock();

    res.json({
        locked: !!lock,
        name: lock?.name || null
    });

});

app.post("/lock", (req, res) => {

    const lock = getLock();

    if (lock) {

        return res.json({
            ok: false,
            name: lock.name
        });

    }


    fs.writeFileSync(
        LOCK_FILE,
        JSON.stringify({
            name: req.body.name,
            time: Date.now()
        })
    );


    res.json({
        ok: true
    });

});

app.post("/unlock", (req, res) => {

    clearLock();

    res.json({
        ok: true
    });

});

app.use(
    "/uploads",
    express.static("data/uploads")
);


app.listen(3000, () => {
    console.log("running");
});