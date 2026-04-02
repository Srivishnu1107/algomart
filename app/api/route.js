export async function POST(req) {
  try {
    const { input, model } = await req.json()

    const response = await fetch(
      `https://api-inference.huggingface.co/models/${model}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inputs: input }),
      }
    )

    const data = await response.json()

    return Response.json(data)
  } catch (error) {
    return Response.json({ error: "Something went wrong" })
  }
}