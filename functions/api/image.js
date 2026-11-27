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

function getModelConfig(provider) {
  switch (provider) {
    case "ultra-cinema-pro":
      return {
        model: "@cf/black-forest-labs/flux-1-schnell",
        input: { steps: 6 }
      };
    case "modern-studio-hd":
      return {
        model: "@cf/stabilityai/stable-diffusion-xl-base-1.0",
        input: { num_steps: 25 }
      };
    case "creative-art-plus":
      return {
        model: "@cf/bytedance/sdxl-lightning",
        input: { num_steps: 8 }
      };
    case "motion-dynamic":
      return {
        model: "@cf/lykon/dreamshaper-8-lcm",
        input: { num_steps: 8 }
      };
    case "clean-background-lite":
      return {
        model: "@cf/stabilityai/sdxl-lightning",
        input: { num_steps: 4 }
      };
    default:
      return null;
  }
}

function isQuotaOrLimitError(err) {
  const msg = `${err && err.message ? err.message : ""} ${err && err.cause ? err.cause : ""}`.toUpperCase();
  return (
    msg.includes("LIMIT") ||
    msg.includes("QUOTA") ||
    msg.includes("RATE") ||
    msg.includes("429") ||
    msg.includes("NEURON") ||
    msg.includes("EXHAUSTED")
  );
}

async function extractImageDataUrl(result) {
  if (!result) return null;

  if (typeof result === "string") {
    if (result.startsWith("data:image/")) return result;
    return `data:image/png;base64,${result}`;
  }

  if (result.image) {
    if (typeof result.image === "string") {
      if (result.image.startsWith("data:image/") || result.image.startsWith("http")) {
        return result.image;
      }
      return `data:image/png;base64,${result.image}`;
    }
  }

  if (result instanceof ArrayBuffer || ArrayBuffer.isView(result)) {
    return `data:image/png;base64,${toBase64(result)}`;
  }

  if (typeof result.arrayBuffer === "function") {
    const buf = await result.arrayBuffer();
    return `data:image/png;base64,${toBase64(buf)}`;
  }

  return null;
}

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    const provider = typeof body.provider === "string" ? body.provider.trim() : "";

    if (!prompt || prompt.length > 1200) {
      return json({ error: "BAD_PROMPT" }, 400);
    }

    const config = getModelConfig(provider);
    if (!config) {
      return json({ error: "UNKNOWN_PROVIDER" }, 400);
    }

    if (!env || !env.AI || typeof env.AI.run !== "function") {
      return json({ error: "AI_BINDING_MISSING" }, 500);
    }

    const aiResponse = await env.AI.run(config.model, {
      prompt: prompt,
      ...config.input
    });

    const imageDataUrl = await extractImageDataUrl(aiResponse);
    if (!imageDataUrl) {
      return json({ error: "EMPTY_IMAGE_RESPONSE" }, 502);
    }

    return json({ image: imageDataUrl, provider: provider });
  } catch (e) {
    if (isQuotaOrLimitError(e)) {
      return json({ error: "LIMIT_REACHED" }, 429);
    }
    return json({ error: e && e.message ? e.message : "GENERATION_FAILED" }, 500);
  }
}
