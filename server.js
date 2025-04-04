import express from "express";
import { google } from "googleapis";
import fs from "fs";
import bodyParser from "body-parser";
import cors from "cors";

// ✅ Đọc credentials từ file
const credentials = JSON.parse(fs.readFileSync("./credentials.json", "utf-8"));

const app = express();
app.use(cors());
app.use(bodyParser.json());

// ✅ Google Auth setup
const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});
const sheets = google.sheets({ version: "v4", auth });

// 📄 Google Sheet Config
const SPREADSHEET_ID = "1A9_JR3cxfqQfQtqhDSIB1gh2qpsWXtwqKyHmKL1IZEk";
const SHEET_NAME = "LSGD";

// 🛒 API: Nhận đơn hàng và ghi vào Google Sheet
app.post("/api/submit-order", async (req, res) => {
  const { gameId, uid, server, name, total } = req.body;

  if (!gameId || !uid || !server || !name || !total) {
    return res.status(400).json({ error: "Thiếu thông tin đơn hàng!" });
  }

  try {
    // 🔍 Lấy mã giao dịch hiện có
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A2:A`,
    });

    const existingCodes = new Set((response.data.values || []).flat());

    // 🆕 Tạo mã giao dịch mới
    let index = 1;
    let newCode = "";
    do {
      newCode = `GD${index.toString().padStart(4, "0")}`;
      index++;
    } while (existingCodes.has(newCode));

    // 🕒 Thời gian hiện tại (Asia/Ho_Chi_Minh)
    const now = new Date();
    const timestamp =
      now.toLocaleTimeString("vi-VN", {
        hour12: false,
        timeZone: "Asia/Ho_Chi_Minh",
      }) +
      " " +
      now.toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });

    // 📥 Dữ liệu dòng mới
    const row = [
      newCode,
      gameId.toUpperCase(),
      uid,
      server,
      name,
      timestamp,
      parseInt(total),
      "Chưa giao",
    ];

    // ✍️ Ghi vào Google Sheet
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:H`,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [row] },
    });

    console.log(`✅ Đã ghi đơn hàng mã ${newCode}`);
    res.json({ success: true, code: newCode });
  } catch (err) {
    console.error("❌ Lỗi khi ghi dữ liệu:", err.message);
    res.status(500).json({ error: "Không thể ghi dữ liệu vào Google Sheet." });
  }
});

// 🚀 Khởi chạy server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server đang chạy tại http://localhost:${PORT}`);
});
