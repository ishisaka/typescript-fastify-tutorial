import Fastify from "fastify";

import {
	serializerCompiler,
	validatorCompiler,
	type ZodTypeProvider,
} from "@fastify/type-provider-zod";

import { userRoutes } from "./users/user.route.js";

export function buildApp() {
	const app = Fastify({
		logger: true,
	});

	app.setValidatorCompiler(validatorCompiler);

	app.setSerializerCompiler(serializerCompiler);

	const typedApp = app.withTypeProvider<ZodTypeProvider>();

	typedApp.register(userRoutes);

	return typedApp;
}
