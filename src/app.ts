import Fastify from 'fastify';

import {
    serializerCompiler,
    validatorCompiler,
    type ZodTypeProvider
} from "@fastify/type-provider-zod";

export function buildApp() {

    const app = Fastify({
        logger: true,
    });

    app.setValidatorCompiler(validatorCompiler);

    app.setSerializerCompiler(serializerCompiler);

    return app.withTypeProvider<ZodTypeProvider>();
}