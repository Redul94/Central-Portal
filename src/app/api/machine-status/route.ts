import { machines } from "@/data/machines";

export const dynamic = "force-dynamic";

type MachineState = "online" | "offline" | "unavailable";

async function checkMachine(url: string): Promise<MachineState> {
  if (!url.trim()) {
    return "unavailable";
  }

  try {
    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(3000),
    });

    // We only need confirmation that the web server responded.
    await response.body?.cancel();

    return "online";
  } catch {
    return "offline";
  }
}

export async function GET() {
  const results = await Promise.all(
    machines.map(async (machine) => ({
      id: String(machine.id),
      status: await checkMachine(machine.url),
    }))
  );

  const statuses = Object.fromEntries(
    results.map((machine) => [
      machine.id,
      machine.status,
    ])
  );

  return Response.json(
    {
      checkedAt: new Date().toISOString(),
      statuses,
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}