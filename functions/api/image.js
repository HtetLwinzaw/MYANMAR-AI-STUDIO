function toBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
  }
  return btoa(binary);
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status: status,
    headers: { "Content-Type": "application/json" }
  });
}

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    const prompt = body.prompt;
    const provider = body.provider;

    if (!prompt || prompt.length > 500) {
      return json({ error: "BAD_PROMPT" }, 400);
    }

    if (provider === "flux") {
      const r = await env.AI.run("@cf/black-forest-labs/flux-1-schnell", {
        prompt: prompt,
        steps: 4
      });
      return json({ image: "data:image/jpeg;base64," + r.image });
    }

    if (provider === "sdxl") {
      const r = await env.AI.run("@cf/bytedance/stable-diffusion-xl-lightning", {
        prompt: prompt
      });
      const buf = await new Response(r).arrayBuffer();
      return json({ image: "data:image/png;base64," + toBase64(buf) });
    }

    return json({ error: "UNKNOWN_PROVIDER" }, 400);
  } catch (e) {
    const msg = String(e && e.message ? e.message : e);
    if (msg.includes("4006") || msg.toLowerCase().includes("daily free allocation")) {
      return json({ error: "LIMIT_REACHED" }, 429);
    }
    return json({ error: "FAILED", detail: msg }, 500);
  }
}
