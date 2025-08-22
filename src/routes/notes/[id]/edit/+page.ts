import type { PageLoad } from './$types';

export const load = (async ({ params }) => {
  return {
    noteId: params.id
  };
}) satisfies PageLoad;