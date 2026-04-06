const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const PORT = 3000;

// نقرأ البيانات من الفورم
app.use(bodyParser.urlencoded({ extended: true }));

// نخلي الموقع يقرأ الملفات (HTML + CSS)
app.use(express.static(__dirname));



// لما يضغط المستخدم Create
app.post("/create", (req, res) => {
    const firstName = req.body.firstName;
    const lastName = req.body.lastName;
    const password = req.body.password;

    if (!firstName || !lastName || !password) {
    return res.send("❌ Please fill all fields");
}

    const cleanFirst = firstName.trim().toLowerCase();
const cleanLast = lastName.trim().toLowerCase();

const email = cleanFirst + "." + cleanLast + "@awumc.com";

    res.send(`
        <h2>🎉 Email Created Successfully</h2>
        <p><b>Email:</b> ${email}</p>
        <p><b>Password:</b> ${password}</p>
        <br><a href="/">⬅️ Back</a>
    `);
});

// تشغيل السيرفر
app.listen(PORT, () => {
    console.log("Server running on http://localhost:" + PORT);
});