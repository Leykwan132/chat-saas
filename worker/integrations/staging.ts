export { KilobotIntegrationEntrypoint } from "./entrypoint";

export default {
  fetch() {
    return new Response(null, { status: 404 });
  },
};
