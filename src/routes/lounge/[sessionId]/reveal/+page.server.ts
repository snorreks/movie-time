// src/routes/lounge/[sessionId]/reveal/+page.server.ts
import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

/**
 * The reveal experience is now inline on the lounge page.
 * Redirect any direct hits to /reveal back to the lounge.
 */
export const load: PageServerLoad = ({ params }) => {
	redirect(302, `/lounge/${params.sessionId}`);
};
