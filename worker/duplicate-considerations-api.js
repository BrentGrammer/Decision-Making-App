import { createJevDuplicatePairsDetector } from "./jev-duplicate-detector.js";

function isStringArray(value) {
    return (
        Array.isArray(value) &&
        value.every((element) => typeof element === "string")
    );
}

export async function handleDuplicateConsiderations(
    request,
    env,
    options = {},
) {
    let body;
    try {
        body = await request.json();
    } catch {
        return Response.json(
            { error: "Invalid considerations" },
            { status: 400 },
        );
    }

    if (!isStringArray(body?.considerations)) {
        return Response.json(
            { error: "Invalid considerations" },
            { status: 400 },
        );
    }

    const detectDuplicatePairs = createJevDuplicatePairsDetector({
        apiKey: env.OPENROUTER_API_KEY,
        fetch: options.fetch,
    });

    try {
        const duplicatePairs = await detectDuplicatePairs(body.considerations);
        return Response.json({ duplicatePairs });
    } catch {
        return Response.json(
            { error: "Duplicate detection failed" },
            { status: 502 },
        );
    }
}
