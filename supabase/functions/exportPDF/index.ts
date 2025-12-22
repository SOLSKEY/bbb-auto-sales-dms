import { serve } from "https://deno.land/std/http/server.ts";
import chromium from "npm:@sparticuz/chromium";
import puppeteer from "npm:puppeteer-core";

serve(async (req: Request): Promise<Response> => {
  const origin = req.headers.get("origin") ?? "*";

  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "OPTIONS, POST",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: {
        "Access-Control-Allow-Origin": origin,
      },
    });
  }

  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;

  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    await page.goto("http://localhost:3000/", { waitUntil: "networkidle0" });

    const pdf = await page.pdf({ printBackground: true, format: "A4" });

    await browser.close();

    return new Response(pdf, {
      headers: {
        "Access-Control-Allow-Origin": origin,
        "Content-Type": "application/pdf",
      },
    });
  } catch (error) {
    console.error("[exportPDF] failed to generate PDF", error);

    if (browser) {
      await browser.close();
    }

    return new Response(
      JSON.stringify({ error: "Failed to generate PDF" }),
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": origin,
          "Content-Type": "application/json",
        },
      },
    );
  }
});
