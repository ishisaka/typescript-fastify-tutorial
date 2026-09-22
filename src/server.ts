import { buildApp } from "./app.js";

const app = buildApp();

app.get("/", async () => {
    return {
        message: "Hello Fastify"
    };
});

await app.listen({
    port: 3000,
    host: "0.0.0.0"
});
