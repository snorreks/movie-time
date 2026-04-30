// src/routes/join/[sessionId]/+page.server.ts
import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

/**
 * The join page has been merged into the lounge page.
 * Permanently redirect all `/join/{sessionId}` links to `/lounge/{sessionId}`.
 */
export const load: PageServerLoad = ({ params }) => {
	redirect(301, `/lounge/${params.sessionId}`);
};
