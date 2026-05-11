import { NextResponse } from "next/server";

let requestCount = 0;
let errorCount = 0;

export function incrementRequestCount() {
  requestCount++;
}

export function incrementErrorCount() {
  errorCount++;
}

export async function GET() {
  const metrics = [
    "# HELP http_requests_total Total number of HTTP requests",
    "# TYPE http_requests_total counter",
    `http_requests_total{app="ai-ticket-intake"} ${requestCount}`,
    "",
    "# HELP http_errors_total Total number of HTTP errors",
    "# TYPE http_errors_total counter",
    `http_errors_total{app="ai-ticket-intake"} ${errorCount}`,
    "",
    "# HELP app_info Application info",
    "# TYPE app_info gauge",
    `app_info{version="0.1.0",app="ai-ticket-intake"} 1`,
  ].join("\n");

  return new NextResponse(metrics, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
