export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { warm } = await import("@/lib/model/store");
  try {
    const s = await warm();
    console.log(
      `[eigentsar] model v${s.version} siap: k=${s.k} r=${s.r} nImages=${s.nImages} nSubjects=${s.nSubjects} createdAt=${s.createdAt}`,
    );
  } catch (err) {
    console.error(`[eigentsar] model gagal dibentuk: ${err instanceof Error ? err.message : String(err)}`);
  }
}