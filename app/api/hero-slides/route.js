import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"

const CONFIG_KEY = "hero_slides"

export async function GET() {
  try {
    const row = await prisma.assistantConfig.findUnique({
      where: { key: CONFIG_KEY },
    })
    let slides = []
    if (row && row.value) {
      try {
        slides = JSON.parse(row.value)
        if (!Array.isArray(slides)) slides = []
      } catch (_) {}
    }
    return NextResponse.json({ slides })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ slides: [] })
  }
}
