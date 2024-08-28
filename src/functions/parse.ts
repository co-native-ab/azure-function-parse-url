import { app, HttpRequest, HttpResponseInit } from "@azure/functions";
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import { NodeHtmlMarkdown } from "node-html-markdown";

interface Body {
  url: string;
}

interface Result {
  title: string;
  html_content: string;
  markdown_content: string;
}

function parseBody(body: any): Body {
  if (!body) {
    throw new Error("No body");
  }

  if (!body.url) {
    throw new Error("No url in body");
  }

  return {
    url: body.url,
  };
}

async function parseUrl(url: string): Promise<Result> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}`);
  }

  let result: Result;
  try {
    const html = await res.text();
    const dom = new JSDOM(html);
    const reader = new Readability(dom.window.document, {
      debug: false,
    });
    const article = reader.parse();
    result = {
      title: article.title,
      html_content: article.content,
      markdown_content: NodeHtmlMarkdown.translate(article.content),
    };
  } catch (e) {
    throw new Error(`Unable to parse ${url}: ${e.message}`);
  }

  return result;
}

export async function parse(request: HttpRequest): Promise<HttpResponseInit> {
  let result: Result;
  try {
    const rawBody = await request.json();
    const body = parseBody(rawBody);
    result = await parseUrl(body.url);
  } catch (e) {
    return {
      status: 400,
      body: e.message,
    };
  }

  return {
    jsonBody: result,
  };
}

app.http("parse", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: parse,
});
