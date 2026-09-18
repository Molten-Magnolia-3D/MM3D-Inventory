import JsBarcode from "jsbarcode";
import { jsPDF } from "jspdf";
import QRCode from "qrcode";

export interface LabelSpec {
  barcode: string;
  title: string;
  subtitle?: string;
}

const LABEL_W = 66.7;
const LABEL_H = 25.4;
const COLS = 3;
const ROWS = 10;
const MARGIN_X = 4.8;
const MARGIN_Y = 12.7;
const GAP_X = 3.2;
const GAP_Y = 0;

function barcodePng(value: string): string {
  const canvas = document.createElement("canvas");
  JsBarcode(canvas, value, {
    format: "CODE128",
    displayValue: false,
    margin: 0,
    height: 60,
    width: 2,
    background: "#ffffff",
    lineColor: "#1c1410",
  });
  return canvas.toDataURL("image/png");
}

async function qrPng(value: string): Promise<string> {
  return QRCode.toDataURL(value, {
    margin: 0,
    width: 128,
    color: { dark: "#1c1410", light: "#ffffff" },
  });
}

export async function buildLabelPdf(labels: LabelSpec[]): Promise<Uint8Array> {
  const doc = new jsPDF({ unit: "mm", format: "letter" });
  const perPage = COLS * ROWS;
  for (let i = 0; i < labels.length; i++) {
    if (i > 0 && i % perPage === 0) doc.addPage();
    const slot = i % perPage;
    const col = slot % COLS;
    const row = Math.floor(slot / COLS);
    const x = MARGIN_X + col * (LABEL_W + GAP_X);
    const y = MARGIN_Y + row * (LABEL_H + GAP_Y);
    const label = labels[i]!;
    doc.setDrawColor(210, 190, 170);
    doc.rect(x, y, LABEL_W, LABEL_H);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(28, 20, 16);
    doc.text(label.title.slice(0, 42), x + 2.2, y + 5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(90, 70, 55);
    doc.text((label.subtitle ?? "").slice(0, 48), x + 2.2, y + 9);
    const code128 = barcodePng(label.barcode);
    const qr = await qrPng(label.barcode);
    doc.addImage(code128, "PNG", x + 2.2, y + 11, 46, 9);
    doc.addImage(qr, "PNG", x + 50.5, y + 10.5, 13.5, 13.5);
    doc.setFontSize(6);
    doc.setTextColor(28, 20, 16);
    doc.text(label.barcode.slice(0, 24), x + 2.2, y + 23.4);
  }
  const output = doc.output("arraybuffer");
  return new Uint8Array(output);
}

export function buildLabelPdfNodeSafe(labels: LabelSpec[]): string {
  const lines = labels.map(
    (l) => `${l.barcode}\t${l.title}\t${l.subtitle ?? ""}`,
  );
  return lines.join("\n");
}
