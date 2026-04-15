🚀 APARAITECH Test Portal

A production-ready online MCQ test platform built using modern web technologies.

---

🧰 Tech Stack

- Backend: Node.js, Express.js
- Frontend: EJS (Server-side rendering), Bootstrap 5
- Database: MongoDB (Mongoose)
- Authentication: OTP-based login (NodeMailer + Sessions)
- Email Service: NodeMailer (SMTP)
- PDF Reports: PDFKit
- Security: Helmet, Session-based auth

---

📁 Project Structure

aparaitech-test-portal/
│
├── server.js
├── .env
├── package.json
│
├── controllers/
├── models/
├── routes/
├── middleware/
├── services/
├── utils/
├── views/
└── public/

---

⚙️ Setup & Installation

1. Install Dependencies

npm install

---

2. Configure Environment

Create a ".env" file in the root directory:

MONGO_URI=your_mongodb_connection

ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=your_password

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email
SMTP_PASS=your_app_password

---

3. Run Application

npm start

Visit in browser:
👉 http://localhost:3000

---

🔐 Authentication

Student Login (OTP)

1. Enter email
2. Receive OTP via email
3. Verify OTP
4. Access dashboard

Admin Login

- Login using email and password
- Redirect to admin dashboard

---

🧑‍💼 Admin Features

- Create and manage tests
- Add MCQ questions
- Generate unique test codes
- View student results
- Download result PDFs

---

🎓 Student Features

- Login using OTP
- Enter test code
- Attempt test with timer
- Auto-submit on timeout
- View results instantly
- Download PDF report

---

🛡️ Key Features

- Question & option randomization
- Timer-based test system
- Anti-cheat protection
- OTP authentication
- PDF result generation
- Fully responsive UI

---

📊 Database Collections

- users → student/admin accounts
- otp_stores → OTP verification
- tests → test configurations
- questions → MCQs
- results → student submissions

---

🔒 Security

- Environment-based configuration
- OTP expiry (TTL index)
- Protected routes with middleware
- Input validation

---

🌐 Deployment

Set environment:

NODE_ENV=production

Run using PM2:

pm2 start server.js --name aparaitech-portal

---

📌 Summary

This platform provides a complete online examination system with:

- Secure authentication
- Test management
- Real-time evaluation
- Automated PDF reporting

---

📬 Contributing

Feel free to fork this repo and submit pull requests.

---

📄 License

This project is licensed under the MIT License.
