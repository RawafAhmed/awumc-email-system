const express = require('express');
const session = require('express-session');
const { google } = require('googleapis');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const PORT = 3000;

app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
  secret: 'secretkey',
  resave: false,
  saveUninitialized: true
}));

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;

const oAuth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

app.get('/', (req, res) => {
  if (!req.session.tokens) {
    return res.send(`
      <h2>WUMC Email System</h2>
      <a href="/auth/google">
        <button>Login with Google</button>
      </a>
    `);
  }

  res.send(`
    <h2>Create Employee Email</h2>
    <form action="/create-user" method="POST">
      <label>First Name:</label><br>
      <input type="text" name="firstName" required><br><br>

      <label>Last Name:</label><br>
      <input type="text" name="lastName" required><br><br>

      <label>Password:</label><br>
      <input type="password" name="password" required><br><br>

      <button type="submit">Create Email</button>
    </form>
  `);
});

app.get('/auth/google', (req, res) => {
  const url = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/admin.directory.user']
  });
  res.redirect(url);
});

app.get('/oauth2callback', async (req, res) => {
  const code = req.query.code;

  try {
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);
    req.session.tokens = tokens;
    res.redirect('/');
  } catch (err) {
    console.log("OAuth callback error:", err.response?.data || err.message || err);
    res.send(`
      <h3>فيه مشكلة في تسجيل الدخول </h3>
      <pre>${JSON.stringify(err.response?.data || err.message || err, null, 2)}</pre>
    `);
  }
});

app.post('/create-user', async (req, res) => {
  if (!req.session.tokens) {
    return res.send("سجلي دخول بقوقل أول");
  }

  const firstName = req.body.firstName;
  const lastName = req.body.lastName;
  const password = req.body.password;

  if (!firstName || !lastName || !password) {
    return res.send("Please fill all fields");
  }

  const cleanFirst = firstName.trim().toLowerCase();
  const cleanLast = lastName.trim().toLowerCase();
  const email = `${cleanFirst}.${cleanLast}@awumc.com`;

  try {
    oAuth2Client.setCredentials(req.session.tokens);

    const admin = google.admin({
      version: 'directory_v1',
      auth: oAuth2Client
    });

    await admin.users.insert({
      requestBody: {
        name: {
          givenName: firstName,
          familyName: lastName
        },
        password: password,
        primaryEmail: email
      }
    });

    res.send(`
      <h2>Email created successfully</h2>
      <p><b>Email:</b> ${email}</p>
      <p><b>Password:</b> ${password}</p>
      <br><a href="/">⬅️ Back</a>
    `);
  } catch (error) {
    console.log(error.response?.data || error.message);
    res.send(`
      <h3>صار خطأ أثناء إنشاء الإيميل ❌</h3>
      <pre>${JSON.stringify(error.response?.data || error.message || error, null, 2)}</pre>
    `);
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
