import { Parser } from "json2csv";
import PDFDocument from "pdfkit";
import Attendance from "../models/Attendance.js";

const resolveQuery = (req) => {
  if (req.user.role === "manager") {
    if (req.query.userId) {
      return { user: req.query.userId };
    }
    return {};
  }
  return { user: req.user._id };
};

export const exportCsv = async (req, res) => {
  const records = await Attendance.find(resolveQuery(req)).populate("user", "name email").sort({ clockIn: -1 });

  const rows = records.map((r) => ({
    employee: r.user?.name,
    email: r.user?.email,
    clockIn: r.clockIn,
    clockOut: r.clockOut,
    status: r.status,
    inLat: r.locationIn?.latitude,
    inLng: r.locationIn?.longitude,
    inIp: r.locationIn?.ip,
    inOffice: r.locationIn?.officeName,
    inAddress: r.locationIn?.officeAddress,
    outLat: r.locationOut?.latitude,
    outLng: r.locationOut?.longitude,
    outIp: r.locationOut?.ip,
    outOffice: r.locationOut?.officeName,
    outAddress: r.locationOut?.officeAddress
  }));

  const parser = new Parser({
    fields: [
      "employee",
      "email",
      "clockIn",
      "clockOut",
      "status",
      "inLat",
      "inLng",
      "inIp",
      "inOffice",
      "inAddress",
      "outLat",
      "outLng",
      "outIp",
      "outOffice",
      "outAddress"
    ]
  });
  const csv = parser.parse(rows);

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", 'attachment; filename="attendance.csv"');
  res.send(csv);
};

export const exportPdf = async (req, res) => {
  const records = await Attendance.find(resolveQuery(req)).populate("user", "name email").sort({ clockIn: -1 }).limit(200);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", 'attachment; filename="attendance.pdf"');

  const doc = new PDFDocument({ margin: 40 });
  doc.pipe(res);

  doc.fontSize(18).text("Attendance Report", { underline: true });
  doc.moveDown();

  records.forEach((r, idx) => {
    doc
      .fontSize(10)
      .text(`${idx + 1}. ${r.user?.name || "Unknown"} (${r.user?.email || "-"})`)
      .text(`   In: ${r.clockIn ? new Date(r.clockIn).toLocaleString() : "-"}`)
      .text(`   Out: ${r.clockOut ? new Date(r.clockOut).toLocaleString() : "-"}`)
      .text(`   Status: ${r.status}`)
      .moveDown(0.6);
  });

  doc.end();
};
