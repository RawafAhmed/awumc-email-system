const express = require('express');
const session = require('express-session');
const { google } = require('googleapis');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname));

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

function renderPage(content, title = "AWUMC Email System") {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${title}</title>
      <link rel="stylesheet" href="/style.css" />
    </head>
    <body>
      <div class="container">
        ${content}
      </div>
    </body>
    </html>
  `;
}

app.get('/', (req, res) => {
  if (!req.session.tokens) {
    return res.send(renderPage(`
      <h1>AWUMC Email Creator</h1>
      <p class="success-text">Login first to create employee emails</p>
      <a class="btn-link" href="/auth/google">Login with Google</a>
    `));
  }

  res.send(renderPage(`
    <h1>AWUMC Email Creator</h1>
    <form action="/create-user" method="POST">
      <label>First Name</label>
      <input type="text" name="firstName" placeholder="First Name" required>

      <label>Last Name</label>
      <input type="text" name="lastName" placeholder="Last Name" required>

      <label>Password</label>
      <input type="password" name="password" placeholder="Strong Password" required>

      <button type="submit">Create Email</button>
    </form>
  `));
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
    res.send(renderPage(`
      <h2>❌ Login Error</h2>
      <p class="success-text">There was a problem with Google login</p>
      <a class="btn-link back-link" href="/">Back</a>
    `, "Login Error"));
  }
});

app.post('/create-user', async (req, res) => {
  if (!req.session.tokens) {
    return res.send(renderPage(`
      <h2>❌ Not logged in</h2>
      <p class="success-text">Please login with Google first</p>
      <a class="btn-link back-link" href="/">Back</a>
    `));
  }

  const firstName = req.body.firstName;
  const lastName = req.body.lastName;
  const password = req.body.password;

  if (!firstName || !lastName || !password) {
    return res.send(renderPage(`
      <h2>❌ Missing fields</h2>
      <p class="success-text">Please fill all fields</p>
      <a class="btn-link back-link" href="/">Back</a>
    `));
  }

  const firstName = req.body.firstName;
  const lastName = req.body.lastName;
  const password = req.body.password;

  if (!firstName || !lastName || !password) {
    return res.send(renderPage(`
      <h2>❌ Missing fields</h2>
      <p class="success-text">Please fill all fields</p>
      <a class="btn-link back-link" href="/">Back</a>
    `));
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

    res.send(renderPage(`
      <h2>✅ Email created successfully</h2>
      <div class="result-box">
        <p><b>Email:</b> ${email}</p>
        <p><b>Password:</b> ${password}</p>
      </div>
      <a class="btn-link back-link" href="/">Create another email</a>
    `, "Email Created"));
  } catch (error) {
    console.log(error.response?.data || error.message || error);
    res.send(renderPage(`
      <h2>❌ Error creating email</h2>
      <div class="result-box">
        <p>${JSON.stringify(error.response?.data || error.message || error, null, 2)}</p>
      </div>
      <a class="btn-link back-link" href="/">Back</a>
    `, "Error"));
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
